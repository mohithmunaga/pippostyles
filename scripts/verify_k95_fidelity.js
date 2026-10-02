const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-verify-k95-' + Date.now());

const chrome = spawn(chromePath, [
  '--remote-debugging-port=9708',
  '--headless=new',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1600,1000',
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
  await sleep(2000);

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9708/json', r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
  const WebSocket = global.WebSocket || require('ws');
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

  // Upload 1 Vertical portrait and 1 Horizontal landscape photo
  const vertBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, '..', 'assets', 'r2', 'large_cover_6cc5e46bed.jpg')).toString('base64');
  const horizBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, '..', 'assets', 'r2', 'moto_corsa_ce5d0ef6f4.jpg')).toString('base64');

  const images = [
    { dataUrl: vertBase64, title: 'pic1' },
    { dataUrl: horizBase64, title: 'pic2' }
  ];
  const uploadRes = await postJSON('/api/upload', { images });
  console.log('Upload result:', uploadRes.success, 'Cards count:', uploadRes.cards?.length);

  const vertSlug = uploadRes.cards[0].slug;
  const horizSlug = uploadRes.cards[1].slug;

  // 1. Check Home 3D Cylinder
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await sleep(3500);

  const shotHome = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'k95_verify_01_home_3d.png'), Buffer.from(shotHome.data, 'base64'));
  console.log('Captured k95_verify_01_home_3d.png');

  // 2. Open vertical photo detail page
  await send('Runtime.evaluate', {
    expression: `window.navigateTo('/projects/${vertSlug}')`
  });
  await sleep(2500);

  const shotVertical = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'k95_verify_02_vertical_electric_blue.png'), Buffer.from(shotVertical.data, 'base64'));
  console.log('Captured k95_verify_02_vertical_electric_blue.png');

  // 3. Open horizontal photo detail page
  await send('Runtime.evaluate', {
    expression: `window.navigateTo('/projects/${horizSlug}')`
  });
  await sleep(2500);

  const shotHorizontal = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'k95_verify_03_horizontal_electric_blue.png'), Buffer.from(shotHorizontal.data, 'base64'));
  console.log('Captured k95_verify_03_horizontal_electric_blue.png');

  // Clear dummy test cards
  await postJSON('/api/cards/clear', {});

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
