const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-visual-test-' + Date.now());

const chrome = spawn(chromePath, [
  '--remote-debugging-port=9700',
  '--headless=new',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1600,950',
  '--user-data-dir=' + profileDir
]);

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function postJSON(pathname, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  await sleep(1500);

  const ver = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9700/json/version', r => {
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
      params: { url: 'http://localhost:3000/' }
    }));
    bws.onmessage = m => res(JSON.parse(m.data));
  });

  const targetId = targetResp.result.targetId;
  await sleep(500);

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9700/json', r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const pageTab = tabs.find(t => t.id === targetId) || tabs[0];
  const pageWs = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(res => pageWs.onopen = res);

  let msgId = 10;
  function send(method, params = {}) {
    return new Promise(res => {
      const id = ++msgId;
      const handler = (e) => {
        const data = JSON.parse(e.data);
        if (data.id === id) {
          pageWs.removeEventListener('message', handler);
          res(data.result);
        }
      };
      pageWs.addEventListener('message', handler);
      pageWs.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  // Wait 4 seconds for preloader to fully complete and reveal scene
  await sleep(4000);

  // 1. Initial 0 cards state
  const shot01 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'visual_test_01_home_ready.png'), Buffer.from(shot01.data, 'base64'));
  console.log('Captured visual_test_01_home_ready.png');

  // 2. Open Works page
  await send('Runtime.evaluate', {
    expression: `window.navigateTo('/works')`
  });
  await sleep(2500);

  const shot02 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'visual_test_02_works_ready.png'), Buffer.from(shot02.data, 'base64'));
  console.log('Captured visual_test_02_works_ready.png');

  // 3. Open Card Manager
  await send('Runtime.evaluate', {
    expression: `window.openImageManager()`
  });
  await sleep(800);

  const shot03 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'visual_test_03_manager_ready.png'), Buffer.from(shot03.data, 'base64'));
  console.log('Captured visual_test_03_manager_ready.png');

  bws.close();
  pageWs.close();
  chrome.kill();
  try {
    fs.rmSync(profileDir, { recursive: true, force: true });
  } catch(e) {}
}

run().catch(e => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
