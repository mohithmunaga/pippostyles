const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-gallery-fix-' + Date.now());
const chrome = spawn(chromePath, ['--remote-debugging-port=9718', '--headless=new', '--window-size=1600,1000', '--user-data-dir=' + profileDir]);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  await sleep(2500);

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9718/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
  const WebSocket = global.WebSocket || require('ws');
  const pageWs = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(r => pageWs.onopen = r);

  const errors = [];
  pageWs.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails);
    }
  });

  let msgId = 10;
  function send(method, params = {}) {
    return new Promise(res => {
      const id = ++msgId;
      const h = e => { const d = JSON.parse(e.data); if (d.id === id) { pageWs.removeEventListener('message', h); res(d.result); } };
      pageWs.addEventListener('message', h);
      pageWs.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://localhost:3000/' });

  await sleep(4500);

  const panelsInfo = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const c = document.getElementById('focal-counter');
        const panels = window.allPanels || [];
        return {
          focalText: c ? c.textContent : null,
          hasCanvas: !!document.getElementById('webgl-canvas'),
          panelCount: panels.length,
          firstPanelPos: panels[0] ? panels[0].position : null,
          firstPanelVis: panels[0] ? panels[0].visible : null,
          firstPanelAlpha: panels[0] ? panels[0].material?.uniforms?.uOpacity?.value : null,
          firstPanelReveal: panels[0] ? panels[0].material?.uniforms?.uReveal?.value : null,
          errors: window.__errors || []
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Panels Info:', JSON.stringify(panelsInfo?.result?.value, null, 2));
  console.log('Browser Exceptions:', JSON.stringify(errors, null, 2));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'k95_gallery_verified_with_cards.png'), Buffer.from(shot.data, 'base64'));
  console.log('Captured k95_gallery_verified_with_cards.png');

  pageWs.close(); chrome.kill();
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch(e){}
}

run().catch(e => { console.error(e); chrome.kill(); });
