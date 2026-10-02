const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-detail-' + Date.now());
const chrome = spawn(chromePath, ['--remote-debugging-port=9710', '--headless=new', '--window-size=1600,1000', '--user-data-dir=' + profileDir]);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function postJSON(pathname, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: '127.0.0.1', port: 3000, path: pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject); req.write(data); req.end();
  });
}

async function run() {
  await sleep(2500);
  const vertBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, '..', 'assets', 'r2', 'large_cover_6cc5e46bed.jpg')).toString('base64');
  const uploadRes = await postJSON('/api/upload', { images: [{ dataUrl: vertBase64, title: 'Wratislavia Cantans' }] });
  const slug = uploadRes.cards[0].slug;

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9710/json', r => {
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

  pageWs.addEventListener('message', e => {
    const d = JSON.parse(e.data);
    if (d.method === 'Runtime.exceptionThrown') {
      console.error('Browser Exception:', JSON.stringify(d.params.exceptionDetails));
    }
    if (d.method === 'Runtime.consoleAPICalled') {
      console.log('Browser Console:', d.params.type, d.params.args.map(a => a.value || a.description).join(' '));
    }
  });

  await send('Page.navigate', { url: 'http://localhost:3000/projects/' + slug });
  await sleep(5500);

  const evalRes = await send('Runtime.evaluate', {
    expression: `
      ({
        url: window.location.href,
        hasAppPage: !!document.getElementById('app-page'),
        appPageHtml: document.getElementById('app-page')?.innerHTML.slice(0, 300),
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        bodyLen: document.body.innerHTML.length
      })
    `,
    returnByValue: true
  });
  console.log('Eval result:', JSON.stringify(evalRes?.result?.value, null, 2));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'k95_exact_project_detail.png'), Buffer.from(shot.data, 'base64'));
  console.log('Captured k95_exact_project_detail.png');

  await postJSON('/api/cards/clear', {});
  pageWs.close(); chrome.kill();
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch(e){}
}
run().catch(e => { console.error(e); chrome.kill(); });
