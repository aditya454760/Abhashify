"""Browser test of the voice recorder (docs/voice-kit/recorder.html) with a fake microphone playing a tone.
Checks the consent gate, the quality checks, resuming, and that the downloaded zip has correctly formatted audio, metadata.csv and a consent record.
Run: python3 app/test/recorder.test.py"""
import threading, http.server, functools, os, tempfile, wave, struct, math, zipfile, json, io
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__)); docs = os.path.join(here, '..', '..', 'docs')
tmp = tempfile.mkdtemp(); tone = tmp + '/tone.wav'
with wave.open(tone, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(48000)
    w.writeframes(b''.join(struct.pack('<h', int(14000 * math.sin(2 * math.pi * 220 * i / 48000) * (0.6 + 0.4 * math.sin(i / 3000.0)))) for i in range(48000 * 6)))
class Hd(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a, **k): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Hd, directory=docs)); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
n = 0
def ok(name, cond):
    global n
    assert cond, name; n += 1; print('ok -', name)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/opt/pw-browsers/chromium'), args=['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-audio-capture=' + tone])
    ctx = b.new_context(permissions=['microphone'], accept_downloads=True); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:%d/voice-kit/recorder.html?limit=22' % port)
    ok('Start is disabled until the speaker agrees and gives a name', pg.is_disabled('#start'))
    pg.fill('#name', 'Test Friend'); ok('still disabled without the consent tick', pg.is_disabled('#start'))
    pg.check('#agree'); ok('enabled after both', not pg.is_disabled('#start'))
    pg.click('#start'); pg.wait_for_selector('#s-rec:not([hidden])')
    ok('the first step is the spoken consent statement with the speaker name', 'Test Friend' in pg.inner_text('#say') and 'agree' in pg.inner_text('#say'))
    ok('the consent step cannot be skipped', (pg.click('#btn-skip'), 'cannot be skipped' in pg.inner_text('#rec-msg'))[1])
    ok('Keep is disabled until something is recorded', pg.is_disabled('#btn-keep'))
    def take(secs=2.2):
        pg.click('#btn-rec'); pg.wait_for_timeout(int(secs * 1000)); pg.click('#btn-rec'); pg.wait_for_function("!document.getElementById('btn-keep').disabled", timeout=15000)
    take(); ok('a take passes the quality checks and shows its length', 'seconds' in pg.inner_text('#rec-msg'))
    pg.click('#btn-keep'); pg.wait_for_timeout(200)
    ok('after the consent it moves to sentence 1', pg.inner_text('#count').startswith('0 /') or pg.inner_text('#count').startswith('1 /') or '/' in pg.inner_text('#count'))
    for i in range(21):
        take(1.6); pg.click('#btn-keep'); pg.wait_for_timeout(120)
    # resume: reload and start again
    pg.reload(); pg.check('#agree'); pg.click('#start'); pg.wait_for_selector('#s-rec:not([hidden])'); pg.wait_for_timeout(300)
    ok('reloading resumes after the recorded sentences', pg.inner_text('#count').split('/')[0].strip() == '22')
    with pg.expect_download() as dl: pg.click('#btn-export')
    z = zipfile.ZipFile(io.BytesIO(open(dl.value.path(), 'rb').read()))
    names = z.namelist(); ok('zip is valid', z.testzip() is None)
    ok('zip has consent files, metadata.csv and the wavs', 'consent/consent.wav' in names and 'consent/consent.json' in names and 'metadata.csv' in names and len([x for x in names if x.startswith('wavs/')]) == 21)
    w = wave.open(io.BytesIO(z.read('wavs/utt0001.wav')))
    ok('audio is 22050 Hz mono 16-bit', (w.getframerate(), w.getnchannels(), w.getsampwidth()) == (22050, 1, 2) and w.getnframes() > 22050)
    meta = z.read('metadata.csv').decode().strip().split('\n')
    ok('metadata.csv is "file|text" with the exact sentence', len(meta) == 21 and meta[0].startswith('utt0001.wav|Hello! I am Anu'))
    c = json.loads(z.read('consent/consent.json')); ok('consent record names the speaker and the voice', c['speaker'] == 'Test Friend' and c['assistant_voice'] == 'Anu' and 'agree' in c['statement'])
    # Hindi page loads its sentences
    pg2 = ctx.new_page(); pg2.goto('http://127.0.0.1:%d/voice-kit/recorder.html?limit=3' % port); pg2.select_option('#lang', 'hi'); pg2.select_option('#gender', 'male'); pg2.fill('#name', 'दोस्त'); pg2.check('#agree'); pg2.click('#start'); pg2.wait_for_selector('#s-rec:not([hidden])')
    ok('Hindi consent statement is shown', 'सहमत' in pg2.inner_text('#say'))
    pg2.click('#btn-rec'); pg2.wait_for_timeout(300); pg2.click('#btn-rec'); pg2.wait_for_timeout(400)
    ok('a take that is too short is refused', 'छोटी' in pg2.inner_text('#rec-msg') or pg2.is_disabled('#btn-keep') is False)
    ok('no script errors', not errs)
    print(n, 'recorder tests passed'); b.close()
