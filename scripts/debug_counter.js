const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-cnt-' + Date.now());
const chrome = spawn(chromePath, ['--remote-debugging-port=9715', '--headless=new', '--window-size=1600,1000', '--user-data-dir=' + profileDir]);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  await sleep(2500);

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9715/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
  const WebSocket = global.WebSocket || require('ws');
  const pageWs = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(r => pageWs.onopen = r);

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
  await sleep(600);
  const info = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const c = document.getElementById('boot-counter');
        const s = document.getElementById('boot-stack');
        const l = document.getElementById('boot-loader');
        return {
          counterText: c ? c.textContent : null,
          counterRect: c ? c.getBoundingClientRect() : null,
          counterColor: c ? getComputedStyle(c).color : null,
          counterDisplay: c ? getComputedStyle(c).display : null,
          counterVisibility: c ? getComputedStyle(c).visibility : null,
          stackRect: s ? s.getBoundingClientRect() : null,
          loaderClasses: l ? l.className : null
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Boot Counter Info:', JSON.stringify(info?.result?.value, null, 2));

  pageWs.close(); chrome.kill();
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch(e){}
}

run().catch(e => { console.error(e); chrome.kill(); });
