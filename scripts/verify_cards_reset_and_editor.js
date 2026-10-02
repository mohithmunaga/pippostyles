const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-cards-editor-test-' + Date.now());

const chrome = spawn(chromePath, [
  '--remote-debugging-port=9697',
  '--headless=new',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1600,950',
  '--user-data-dir=' + profileDir
]);

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function run() {
  await sleep(1500);

  const ver = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9697/json/version', r => {
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
    http.get('http://127.0.0.1:9697/json', r => {
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

  await sleep(3500);

  // 1. Initial State with 0 cards (Clean placeholders)
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'editor_test_01_empty_home.png'), Buffer.from(shot1.data, 'base64'));
  console.log('Captured editor_test_01_empty_home.png');

  // 2. Open Card Manager Modal
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        document.getElementById('btn-sync-phone')?.click();
      })()
    `
  });
  await sleep(600);

  const shotManager = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'editor_test_02_card_manager.png'), Buffer.from(shotManager.data, 'base64'));
  console.log('Captured editor_test_02_card_manager.png');

  // Close modal
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        document.getElementById('card-mgr-close-btn')?.click();
      })()
    `
  });
  await sleep(400);

  // 3. Open Mobile Upload Page in mobile viewport
  const mobileTabResp = await new Promise(res => {
    bws.send(JSON.stringify({
      id: 2,
      method: 'Target.createTarget',
      params: { url: 'http://localhost:3000/upload' }
    }));
    bws.onmessage = m => res(JSON.parse(m.data));
  });

  const mobTabId = mobileTabResp.result.targetId;
  await sleep(500);

  const mobTabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9697/json', r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const mobTab = mobTabs.find(t => t.id === mobTabId);
  const mobWs = new WebSocket(mobTab.webSocketDebuggerUrl);
  await new Promise(res => mobWs.onopen = res);

  let mobMsgId = 100;
  function sendMob(method, params = {}) {
    return new Promise(res => {
      const id = ++mobMsgId;
      const handler = (e) => {
        const data = JSON.parse(e.data);
        if (data.id === id) {
          mobWs.removeEventListener('message', handler);
          res(data.result);
        }
      };
      mobWs.addEventListener('message', handler);
      mobWs.send(JSON.stringify({ id, method, params }));
    });
  }

  await sendMob('Page.enable');
  await sendMob('Runtime.enable');
  await sendMob('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
    hasTouch: true
  });

  await sleep(1500);

  const shotMobileUploader = await sendMob('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'editor_test_03_mobile_upload_page.png'), Buffer.from(shotMobileUploader.data, 'base64'));
  console.log('Captured editor_test_03_mobile_upload_page.png');

  bws.close();
  pageWs.close();
  mobWs.close();
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
