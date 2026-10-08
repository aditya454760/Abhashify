/* Runs only on the Abhyashify page. It passes messages between the page and the extension.
   The page can ask for study-site totals and tell the extension which tools you added there. Nothing else is shared. */
(function () {
  const send = o => window.postMessage(Object.assign({ src: 'abhyashify-ext' }, o), location.origin);
  window.addEventListener('message', async e => {
    if (e.source !== window || e.origin !== location.origin) return;
    const m = e.data;
    if (!m || m.src !== 'abhyashify-app') return;
    try {
      if (m.type === 'tools') await chrome.runtime.sendMessage({ type: 'tools', tools: m.tools });
      else if (m.type === 'getUsage') send({ type: 'usage', data: await chrome.runtime.sendMessage({ type: 'export' }) });
      else if (m.type === 'ping') send({ type: 'hello', version: chrome.runtime.getManifest().version });
    } catch (err) { /* extension was reloaded: the page will ask again next time */ }
  });
  send({ type: 'hello', version: chrome.runtime.getManifest().version });
})();
