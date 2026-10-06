"""Browser test of the offline voice pack with a real Chromium, the real worker, ONNX Runtime and eSpeak, and a stand-in model.
Run: python3 app/test/voicepack.test.py   (needs: pip install playwright onnx, node, and Chromium; see README)"""
import threading, http.server, functools, json, os, subprocess, sys, tempfile, struct, time
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__)); docs = os.path.join(here, '..', '..', 'docs')
tmp = tempfile.mkdtemp(); subprocess.check_call([sys.executable, os.path.join(here, 'voicepack', 'make-standin.py'), tmp], stdout=subprocess.DEVNULL)
class Hd(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript', '.wasm': 'application/wasm'}
    def log_message(self, *a, **k): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Hd, directory=docs)); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
idmap = json.load(open(tmp + '/standin-en-us.onnx.json'))['phoneme_id_map']
def expected(voice, texts):
    r = subprocess.run(['node', os.path.join(here, 'voicepack', 'expected.mjs')], input=json.dumps({'map': idmap, 'voice': voice, 'texts': texts}), capture_output=True, text=True, check=True)
    return json.loads(r.stdout)
def wav_ids(b, maxid):
    b = bytes(b); assert b[:4] == b'RIFF' and b[8:12] == b'WAVE'
    rate = struct.unpack('<I', b[24:28])[0]; n = struct.unpack('<I', b[40:44])[0] // 2
    s = struct.unpack('<%dh' % n, b[44:44 + n * 2])
    return rate, [round(v / 32767 * maxid) for v in s]
n = 0
def ok(name, cond):
    global n
    assert cond, name; n += 1; print('ok -', name)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/opt/pw-browsers/chromium'), args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 400, 'height': 800}, service_workers='allow'); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    base = 'http://127.0.0.1:%d/' % port
    pg.goto(base, wait_until='domcontentloaded'); pg.evaluate("localStorage.setItem('pl.mode','\"local\"')"); pg.reload(wait_until='domcontentloaded')
    pg.wait_for_selector('[data-act=tpl]', timeout=40000); pg.click('[data-act=tpl]'); pg.wait_for_timeout(300)
    pg.evaluate("window.__wav=[];window.CV_PLAY=(b,m,r)=>{window.__wav.push(Array.from(new Uint8Array(b)));return Promise.resolve()};0")
    pg.evaluate("window.__spoken=[];if(window.speechSynthesis){speechSynthesis.speak=u=>{window.__spoken.push(u.text);setTimeout(()=>u.onend&&u.onend(),2)}};0")
    pg.click('#asstfab'); pg.click('[data-asa=cfg]'); pg.wait_for_timeout(200)
    ok('the offline pack section is shown', pg.locator('#cvp-en').count() == 1 and pg.locator('#cvp-hi').count() == 1)
    pg.locator('#cvp-en').set_input_files([tmp + '/standin.onnx', tmp + '/standin-en-us.onnx.json'])
    pg.click('[data-cv-act=packadd][data-lang=en]'); pg.wait_for_timeout(400)
    ok('adding without ticking the permission box is refused', pg.evaluate("!ACFG.cv.female||!ACFG.cv.female.pack"))
    pg.check('[data-cv=packok]'); pg.locator('#cvp-en').set_input_files([tmp + '/standin.onnx', tmp + '/standin-en-us.onnx.json'])
    pg.click('[data-cv-act=packadd][data-lang=en]'); pg.wait_for_function("ACFG.cv.female&&ACFG.cv.female.pack&&ACFG.cv.female.pack.en", timeout=60000)
    ok('the English pack was checked in the real worker and saved', pg.evaluate("ACFG.cv.female.pack.en.sr") == 16000)
    ok('the model is stored in IndexedDB, not in settings', pg.evaluate("CVDB.get('packs','female|en').then(r=>!!(r&&r.model&&r.model.byteLength>100))") and pg.evaluate("localStorage.getItem('pl.asst').length") < 3000)
    pg.evaluate("window.__wav=[]")
    pg.evaluate("speak('Hello, how are you? Alarm set for six.')"); pg.wait_for_function("window.__wav.length>=2", timeout=60000)
    exp = expected('en-us', ['Hello, how are you?', 'Alarm set for six.'])
    got = [wav_ids(w, max(e)) for w, e in zip(pg.evaluate("window.__wav"), exp)]
    ok('English: the model received exactly the expected phoneme ids', all(g[1] == e for g, e in zip(got, exp)) and got[0][0] == 16000)
    ok('the device voice was not used', pg.evaluate("window.__spoken.length") == 0)
    # Hindi pack
    pg.locator('#cvp-hi').set_input_files([tmp + '/standin.onnx', tmp + '/standin-hi.onnx.json']); pg.check('[data-cv=packok]') if not pg.is_checked('[data-cv=packok]') else None
    pg.click('[data-cv-act=packadd][data-lang=hi]'); pg.wait_for_function("ACFG.cv.female.pack.hi", timeout=60000)
    pg.evaluate("setLang('hi')"); pg.wait_for_timeout(200); pg.evaluate("window.__wav=[]")
    pg.evaluate("speak('नमस्ते। आप कैसे हैं?')"); pg.wait_for_function("window.__wav.length>=2", timeout=60000)
    exph = expected('hi', ['नमस्ते।', 'आप कैसे हैं?'])
    goth = [wav_ids(w, max(e)) for w, e in zip(pg.evaluate("window.__wav"), exph)]
    ok('Hindi: the model received exactly the expected phoneme ids', all(g[1] == e for g, e in zip(goth, exph)) and len(exph[0]) > 8)
    pg.evaluate("setLang('en')")
    # a language without a pack falls back to the device voice
    pg.evaluate("cvSave('female',{pack:{en:ACFG.cv.female.pack.en}})"); pg.evaluate("setLang('hi')"); pg.evaluate("window.__wav=[];window.__spoken=[]")
    pg.evaluate("speak('नमस्ते')"); pg.wait_for_timeout(800)
    ok('with no pack for the language, the device voice speaks', pg.evaluate("window.__wav.length") == 0 and pg.evaluate("window.__spoken.length") >= 1)
    pg.evaluate("setLang('en')")
    # offline after a reload: runtime files must come from the saved copies
    pg.wait_for_timeout(1500); pg.evaluate("navigator.serviceWorker.ready.then(()=>1)")
    cached = pg.evaluate("caches.keys().then(async ks=>{let out=[];for(const k of ks){const c=await caches.open(k);out=out.concat((await c.keys()).map(r=>new URL(r.url).pathname))}return out})")
    ok('the service worker saved the voice engine files for offline use', any(x.endswith('espeak-ng.wasm') for x in cached) and any(x.endswith('ort-wasm-simd-threaded.wasm') for x in cached) and any(x.endswith('worker.mjs') for x in cached))
    ctx.set_offline(True); pg.reload(wait_until='domcontentloaded'); pg.wait_for_selector('[data-act=tpl],#asstfab', timeout=40000)
    pg.evaluate("window.__wav=[];window.CV_PLAY=(b,m,r)=>{window.__wav.push(Array.from(new Uint8Array(b)));return Promise.resolve()};0")
    pg.evaluate("speak('Hello, how are you?')"); pg.wait_for_function("window.__wav.length>=1", timeout=60000)
    ok('OFFLINE after a reload: the voice pack still speaks', wav_ids(pg.evaluate("window.__wav[0]"), max(exp[0]))[1] == exp[0])
    ctx.set_offline(False)
    # removing
    pg.click('#asstfab'); pg.click('[data-asa=cfg]'); pg.wait_for_selector('[data-cv-act=packrm][data-lang=en]'); pg.click('[data-cv-act=packrm][data-lang=en]'); pg.wait_for_timeout(300)
    ok('removing deletes the pack from settings and storage', pg.evaluate("!ACFG.cv.female.pack.en") and pg.evaluate("CVDB.get('packs','female|en').then(r=>!r)"))
    # a broken model is rejected
    open(tmp + '/bad.onnx', 'wb').write(b'not a model'); pg.check('[data-cv=packok]') if not pg.is_checked('[data-cv=packok]') else None
    pg.locator('#cvp-en').set_input_files([tmp + '/bad.onnx', tmp + '/standin-en-us.onnx.json']); pg.click('[data-cv-act=packadd][data-lang=en]'); pg.wait_for_timeout(1500)
    ok('a broken model is rejected and not saved', pg.evaluate("!ACFG.cv.female.pack.en") and 'could not be loaded' in pg.inner_text('#as-cfg'))
    ok('no script errors', not errs)
    print(n, 'voice pack tests passed'); b.close()
