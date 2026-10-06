#!/usr/bin/env python3
"""Assemble docs/index.html (the website) from app/src. Run: python3 app/build.py"""
import os, shutil
here = os.path.dirname(os.path.abspath(__file__))
src = lambda n: open(os.path.join(here, 'src', n), encoding='utf-8').read()
root = os.path.join(here, '..')
head = src('head.html').replace('</style>', src('extra.css') + '</style>', 1)
i = head.index('</style>') + len('</style>')
head_part, body_part = head[:i], head[i:]
overlap = open(os.path.join(root, 'sync', 'core', 'overlap.js'), encoding='utf-8').read()
page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="theme-color" content="#4349C9">\n<meta name="referrer" content="no-referrer">\n'
        '<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="Prep Ledger">\n<link rel="icon" href="icon.svg" type="image/svg+xml">\n'
        + head_part + '\n</head>\n<body>\n' + body_part +
        '\n<script>window.FBReady=new Promise(function(r){window.__fbResolve=r});</script>\n'
        '<script type="module">\n' + src('firebase-module.js') + '</script>\n'
        '<script>\n' + overlap + '\n</script>\n'
        '<script>\n' + src('logic.js') + src('state.js') + src('views.js') + src('forms.js') + '</script>\n</body>\n</html>\n')
out = os.path.join(root, 'docs')
os.makedirs(out, exist_ok=True)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(page)
print('wrote docs/index.html', len(page), 'bytes')
