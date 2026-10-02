const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-quick-check');

const chrome = spawn(chromePath, [
  '--remote-debugging-port=9222',
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
    http.get('http://127.0.0.1:9222/json/version', r => {
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
    http.get('http://127.0.0.1:9222/json', r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const pageTab = tabs.find(t => t.id === targetId) || tabs[0];
  console.log('Connected to tab:', pageTab.url, 'id:', pageTab.id);
  const pageWs = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(res => pageWs.onopen = res);

  pageWs.send(JSON.stringify({ id: 10, method: 'Page.enable' }));
  pageWs.send(JSON.stringify({ id: 11, method: 'Runtime.enable' }));

  pageWs.onmessage = (m) => {
    const p = JSON.parse(m.data);
    if (p.method === 'Runtime.consoleAPICalled') {
      console.log('[Console]', p.params.type, p.params.args.map(a => a.value || a.description).join(' '));
    }
    if (p.method === 'Runtime.exceptionThrown') {
      console.error('[Exception]', p.params.exceptionDetails.text, p.params.exceptionDetails.exception?.description);
    }
  };

  await sleep(3500);

  // Click LIST button
  console.log('Dispatching click to works-list-btn...');
  pageWs.send(JSON.stringify({
    id: 20,
    method: 'Runtime.evaluate',
    params: { expression: "document.getElementById('works-list-btn').click();" }
  }));

  await sleep(1000);

  const html = await new Promise(res => {
    const handler = (m) => {
      const p = JSON.parse(m.data);
      if (p.id === 21) {
        pageWs.removeEventListener('message', handler);
        console.log('p.result:', JSON.stringify(p.result));
        res(p.result?.result?.value);
      }
    };
    pageWs.addEventListener('message', handler);
    pageWs.send(JSON.stringify({
      id: 21,
      method: 'Runtime.evaluate',
      params: { expression: "document.title" }
    }));
  });
  console.log('Title:', html);

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
