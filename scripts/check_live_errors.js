const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-err-check-' + Date.now());
const chrome = spawn(chromePath, ['--remote-debugging-port=9717', '--headless=new', '--user-data-dir=' + profileDir]);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  await sleep(2500);

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9717/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
  const WebSocket = global.WebSocket || require('ws');
  const pageWs = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(r => pageWs.onopen = r);

  const errors = [];
  const logs = [];

  pageWs.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails);
    }
    if (msg.method === 'Console.messageAdded') {
      logs.push(msg.params.message);
    }
    if (msg.method === 'Log.entryAdded') {
      logs.push(msg.params.entry);
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
  await send('Console.enable');
  await send('Log.enable');

  console.log('Navigating to http://localhost:3000/ ...');
  await send('Page.navigate', { url: 'http://localhost:3000/' });

  await sleep(4000);

  console.log('=== CAUGHT JAVASCRIPT ERRORS ===');
  console.log(JSON.stringify(errors, null, 2));

  console.log('\n=== CAUGHT CONSOLE LOGS / WARNINGS ===');
  console.log(JSON.stringify(logs, null, 2));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'current_error_state.png'), Buffer.from(shot.data, 'base64'));

  pageWs.close(); chrome.kill();
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch(e){}
}

run().catch(e => { console.error(e); chrome.kill(); });
