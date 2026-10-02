const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9727',
  '--headless=new',
  '--window-size=1600,1000',
  '--user-data-dir=' + path.join(__dirname, '..', '.chrome-subpages-' + Date.now())
]);

async function main() {
  await new Promise(r => setTimeout(r, 2000));
  const tabs = await new Promise(res => http.get('http://127.0.0.1:9727/json', r => {
    let d=''; r.on('data', c=>d+=c); r.on('end', ()=>res(JSON.parse(d)));
  }));
  const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
  const ws = new (global.WebSocket || require('ws'))(pageTab.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 0;
  const send = (m, p={}) => new Promise(res => {
    const i = ++id;
    const h = e => { const d=JSON.parse(e.data); if(d.id===i){ ws.removeEventListener('message', h); res(d.result); } };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({id:i, method:m, params:p}));
  });

  await send('Page.enable');
  await send('Runtime.enable');

  // 1. Verify /works
  await send('Page.navigate', { url: 'http://localhost:3000/works' });
  await new Promise(r => setTimeout(r, 1500));
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'k95_live_verified_works_page.png'), Buffer.from(shot.data, 'base64'));

  // 2. Verify project detail
  await send('Page.navigate', { url: 'http://localhost:3000/projects/pic-4-1788018243334' });
  await new Promise(r => setTimeout(r, 1500));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'k95_live_verified_project_detail.png'), Buffer.from(shot.data, 'base64'));

  console.log('Subpages verified and captured.');
  ws.close();
  chrome.kill();
}

main().catch(e => { console.error(e); chrome.kill(); });
