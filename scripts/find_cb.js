const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-find-cb-' + Date.now());

const chrome = spawn(chromePath, [
  '--remote-debugging-port=9777',
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
    http.get('http://127.0.0.1:9777/json/version', r => {
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
    http.get('http://127.0.0.1:9777/json', r => {
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
  await sleep(800);

  await evalPage("document.getElementById('works-list-btn').click();");
  await sleep(800);

  const parentTree = await evalPage(`
    (() => {
      const shell = document.querySelector('.works-list__preview-shell');
      const results = [];
      let el = shell;
      while (el && el !== document.documentElement) {
        const cs = window.getComputedStyle(el);
        results.push({
          tag: el.tagName,
          class: el.className,
          id: el.id,
          transform: cs.transform,
          willChange: cs.willChange,
          filter: cs.filter,
          perspective: cs.perspective,
          contain: cs.contain
        });
        el = el.parentElement;
      }
      return JSON.stringify(results, null, 2);
    })()
  `);
  console.log('CONTAINING BLOCK PARENT TREE:\n', parentTree);

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
