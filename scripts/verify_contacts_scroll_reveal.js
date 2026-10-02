const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-contacts-reveal-' + Date.now());

const chrome = spawn(chromePath, [
  '--remote-debugging-port=9679',
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
    http.get('http://127.0.0.1:9679/json/version', r => {
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
      params: { url: 'http://localhost:3000/contacts' }
    }));
    bws.onmessage = m => res(JSON.parse(m.data));
  });

  const targetId = targetResp.result.targetId;
  await sleep(500);

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9679/json', r => {
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
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1600,
    height: 950,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log('Waiting for initial entrance reveal...');
  await sleep(3500);

  // 1. Initial State Screenshot (Full character reveal)
  const initialShot = await send('Page.captureScreenshot', { format: 'png' });
  const initialDest = path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'contacts_initial_reveal.png');
  fs.writeFileSync(initialDest, Buffer.from(initialShot.data, 'base64'));
  console.log('Saved initial reveal screenshot to contacts_initial_reveal.png');

  // 2. Scroll down to 700px
  console.log('Scrolling down to 700px...');
  await send('Runtime.evaluate', {
    expression: 'window.scrollTo({ top: 700, behavior: "smooth" })'
  });
  await sleep(800);

  // 3. Scroll back UP to 0px
  console.log('Scrolling back UP to 0px...');
  await send('Runtime.evaluate', {
    expression: 'window.scrollTo({ top: 0, behavior: "smooth" })'
  });
  await sleep(600);

  // 4. Capture during scroll up reveal
  const scrollUpShot = await send('Page.captureScreenshot', { format: 'png' });
  const scrollUpDest = path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'contacts_scroll_up_reveal.png');
  fs.writeFileSync(scrollUpDest, Buffer.from(scrollUpShot.data, 'base64'));
  console.log('Saved scroll up reveal screenshot to contacts_scroll_up_reveal.png');

  const charStatus = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const chars = Array.from(document.querySelectorAll('.gsap-char-reveal')).map(c => ({
          text: c.textContent,
          transform: c.style.transform,
          opacity: c.style.opacity
        }));
        return chars;
      })()
    `,
    returnByValue: true
  });
  console.log('CHARACTER STATES:', JSON.stringify(charStatus.result.value, null, 2));

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
