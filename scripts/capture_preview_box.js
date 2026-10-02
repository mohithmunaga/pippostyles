const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-preview-' + Date.now());

const chrome = spawn(chromePath, [
  '--remote-debugging-port=9555',
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=' + profileDir
]);

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function run() {
  await sleep(1500);

  const ver = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9555/json/version', r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const WebSocket = global.WebSocket || require('ws');
  const bws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise(res => bws.onopen = res);

  const targetResp = await new Promise(res => {
    bws.send(JSON.stringify({
      id: 1,
      method: 'Target.createTarget',
      params: { url: 'http://localhost:3000/works' }
    }));
    bws.onmessage = m => res(JSON.parse(m.data));
  });

  const targetId = targetResp.result.targetId;
  await sleep(500);

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9555/json', r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const pageTab = tabs.find(t => t.id === targetId) || tabs[0];
  const pageWs = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(res => pageWs.onopen = res);

  pageWs.send(JSON.stringify({ id: 10, method: 'Page.enable' }));
  pageWs.send(JSON.stringify({ id: 11, method: 'Runtime.enable' }));
  pageWs.send(JSON.stringify({
    id: 12,
    method: 'Emulation.setDeviceMetricsOverride',
    params: { width: 1600, height: 950, deviceScaleFactor: 1, mobile: false }
  }));

  let msgId = 100;
  function evalPage(expr) {
    const id = ++msgId;
    return new Promise(res => {
      const handler = (m) => {
        const p = JSON.parse(m.data);
        if (p.id === id) {
          pageWs.removeEventListener('message', handler);
          res(p.result?.result?.value);
        }
      };
      pageWs.addEventListener('message', handler);
      pageWs.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
    });
  }

  for (let i = 0; i < 60; i++) {
    const isDone = await evalPage("document.getElementById('boot-loader')?.style?.display === 'none' && !!document.getElementById('works-list-btn')");
    if (isDone) break;
    await sleep(300);
  }
  await sleep(1000);

  // Switch to List Mode
  await evalPage("document.getElementById('works-list-btn').click();");
  await sleep(1200);

  // Get preview status
  const previewStatus = await evalPage(`
    (() => {
      const shell = document.querySelector('.works-list__preview-shell');
      const img = document.querySelector('.works-list__preview-image');
      const rect = shell?.getBoundingClientRect();
      return JSON.stringify({
        shellClass: shell?.className,
        rect: rect ? { top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null,
        imgSrc: img?.src,
        imgNaturalWidth: img?.naturalWidth,
        imgNaturalHeight: img?.naturalHeight,
        imgOpacity: window.getComputedStyle(img).opacity
      }, null, 2);
    })()
  `);
  console.log('PREVIEW STATUS:\n', previewStatus);

  // Take screenshot
  const shotResp = await new Promise(res => {
    const id = ++msgId;
    const handler = (m) => {
      const p = JSON.parse(m.data);
      if (p.id === id) {
        pageWs.removeEventListener('message', handler);
        res(p.result.data);
      }
    };
    pageWs.addEventListener('message', handler);
    pageWs.send(JSON.stringify({ id, method: 'Page.captureScreenshot', params: { format: 'png' } }));
  });

  const artifactDir = 'C:\\Users\\mohit\\.gemini\\antigravity-ide\\brain\\49ab7651-6fbf-435b-bbac-8821e62d0bc6';
  fs.writeFileSync(path.join(artifactDir, 'works_list_preview_centered.png'), Buffer.from(shotResp, 'base64'));
  console.log('Saved screenshot to works_list_preview_centered.png');

  pageWs.close();
  bws.close();
  chrome.kill();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  chrome.kill();
  process.exit(1);
});
