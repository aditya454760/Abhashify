"""Real-browser test of the study-timer extension (Chromium with the extension loaded, a local copy of the site, and
stand-in hosts that all point at 127.0.0.1). Takes about 80 seconds because it really waits for a minute of study time.
Run from the project root:  python3 extension/test/ext.test.py
The manifest is copied to a temp folder with the page match changed to the local test server; the real manifest is not touched."""
import asyncio, sys, subprocess, time, json, os, shutil, tempfile
from playwright.async_api import async_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
SP=tempfile.mkdtemp(prefix='abhyext')
shutil.copytree(os.path.join(ROOT,'extension'),SP+'/ext',ignore=shutil.ignore_patterns('test'))
m=json.load(open(SP+'/ext/manifest.json')); m['content_scripts'][0]['matches']=['http://localhost:8765/*']; json.dump(m,open(SP+'/ext/manifest.json','w'))
srv=subprocess.Popen(['python3','-m','http.server','8765','--directory',os.path.join(ROOT,'docs'),'--bind','127.0.0.1'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
ok=0; bad=0
def chk(n,c):
    global ok,bad
    print(('ok - ' if c else 'FAIL - ')+n)
    if c: ok+=1
    else: bad+=1
async def main():
    async with async_playwright() as p:
        ctx=await p.chromium.launch_persistent_context(SP+'/prof',channel='chromium',headless=True,args=['--disable-extensions-except='+SP+'/ext','--load-extension='+SP+'/ext','--host-resolver-rules=MAP study.example 127.0.0.1, MAP other.example 127.0.0.1'])
        sw=ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker')
        chk('extension service worker started',bool(sw))
        app=await ctx.new_page()
        errs=[]; app.on('pageerror',lambda e:errs.append(str(e)))
        await app.route('**/gstatic.com/**',lambda r:r.abort())
        await app.goto('http://localhost:8765/index.html'); await app.wait_for_timeout(1200)
        await app.evaluate("applyTemplate()"); await app.wait_for_timeout(300)
        await app.evaluate("(()=>{S.plan.tools=[{id:'tstudy',name:'Study site',url:'http://study.example:8765/',pkg:''}];mark('plan');setTrack(true);extAsk()})()")
        await app.wait_for_timeout(1500)
        seen=await app.evaluate("EXT.seen")
        chk('page sees the extension (hello)',seen is True)
        st=await sw.evaluate("chrome.storage.local.get('domains')")
        hosts=[d['host'] for d in st['domains']]
        chk('tools added in the app reach the extension',  'study.example' in hosts)
        chk('default sites are present',  'youtube.com' in hosts)
        # study tab
        study=await ctx.new_page(); await study.goto('http://study.example:8765/index.html'); await study.bring_to_front()
        other=None
        await study.wait_for_timeout(2000)
        cur=await sw.evaluate("chrome.storage.local.get('cur')")
        chk('time is being counted on the chosen site',(cur.get('cur') or {}).get('host')=='study.example')
        await study.wait_for_timeout(65000)
        # an unlisted site must not be counted or stored
        other=await ctx.new_page(); await other.goto('http://other.example:8765/index.html'); await other.bring_to_front(); await other.wait_for_timeout(1500)
        cur=await sw.evaluate("chrome.storage.local.get('cur')")
        chk('an unlisted site is not counted',cur.get('cur') is None)
        u=await sw.evaluate("chrome.storage.local.get('usage')")
        raw=json.dumps(u)
        chk('minutes were stored for the chosen site',any(v.get('study.example',0)>=60000 for v in u['usage'].values()))
        chk('the unlisted site never appears in storage','other.example' not in raw and 'index.html' not in raw)
        await app.bring_to_front(); await app.wait_for_timeout(800)
        await app.evaluate("EXT.manual=true;extAsk()"); await app.wait_for_timeout(1500)
        logs=await app.evaluate("S.logs.filter(l=>/^ph-/.test(l.id)).map(l=>({id:l.id,m:l.m,tool:l.tool,dev:l.dev,src:l.src}))")
        print(logs)
        chk('the app imported the browser time as a log',len(logs)==1 and logs[0]['m']>=1 and logs[0]['dev']=='laptop')
        chk('the log is linked to the tool added in the app',len(logs)==1 and logs[0]['tool']=='tstudy')
        # no duplicate on repeat
        await app.evaluate("extAsk()"); await app.wait_for_timeout(1000)
        n=await app.evaluate("S.logs.filter(l=>/^ph-/.test(l.id)).length")
        chk('asking again does not duplicate',n==1)
        # consent off => nothing imported
        await app.evaluate("(()=>{S.logs=S.logs.filter(l=>!/^ph-/.test(l.id));setTrack(false);extSend({type:'getUsage'})})()"); await app.wait_for_timeout(1200)
        n=await app.evaluate("S.logs.filter(l=>/^ph-/.test(l.id)).length")
        chk('with tracking off nothing is imported',n==0)
        # pause
        await sw.evaluate("chrome.storage.local.set({paused:true})")
        await study.bring_to_front(); await study.wait_for_timeout(1500)
        cur=await sw.evaluate("chrome.storage.local.get('cur')")
        chk('pause stops counting',cur.get('cur') is None)
        # popup
        eid=sw.url.split('/')[2]
        pop=await ctx.new_page(); await pop.goto(f'chrome-extension://{eid}/popup.html'); await pop.wait_for_timeout(800)
        txt=await pop.inner_text('body')
        chk('popup lists the sites',('study.example' in txt) and ('youtube.com' in txt))
        await pop.screenshot(path=SP+'/ext_popup.png')
        # tools sheet
        await app.bring_to_front(); await app.evaluate("toolsSheet()"); await app.wait_for_timeout(500)
        t=await app.inner_text('#sf')
        chk('tools sheet says the extension is connected','extension is connected' in t)
        chk('no script errors in the page',errs==[])
        await ctx.close()
    print(ok,'extension tests passed' if not bad else 'extension tests passed, %d FAILED'%bad)
    if bad: sys.exit(1)
try: asyncio.run(main())
finally: srv.terminate(); shutil.rmtree(SP,ignore_errors=True)
