const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-verify-aspect-' + Date.now());

const chrome = spawn(chromePath, [
  '--remote-debugging-port=9706',
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
  await sleep(2000);

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9706/json', r => {
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

  // 1. Upload 1 Vertical photo and 1 Horizontal photo
  const vertBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, '..', 'assets', 'r2', 'large_cover_6cc5e46bed.jpg')).toString('base64');
  const horizBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, '..', 'assets', 'r2', 'moto_corsa_ce5d0ef6f4.jpg')).toString('base64');

  const images = [
    { dataUrl: vertBase64, title: 'pic1_vertical' },
    { dataUrl: horizBase64, title: 'pic2_horizontal' }
  ];
  const uploadRes = await postJSON('/api/upload', { images });
  console.log('Upload result:', uploadRes.success, 'Cards count:', uploadRes.cards?.length);

  const vertSlug = uploadRes.cards[0].slug;
  const horizSlug = uploadRes.cards[1].slug;
  console.log('Slugs:', vertSlug, horizSlug);

  // Navigate to home page
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await sleep(4000);

  // 1. Capture 3D Gallery showing both vertical & horizontal cards
  const shotHome = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'aspect_01_3d_home.png'), Buffer.from(shotHome.data, 'base64'));
  console.log('Captured aspect_01_3d_home.png');

  // 2. Open vertical photo detail page
  await send('Runtime.evaluate', {
    expression: `window.navigateTo('/projects/${vertSlug}')`
  });
  await sleep(2500);

  const shotVertical = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'aspect_02_vertical_detail.png'), Buffer.from(shotVertical.data, 'base64'));
  console.log('Captured aspect_02_vertical_detail.png');

  // 3. Open horizontal photo detail page
  await send('Runtime.evaluate', {
    expression: `window.navigateTo('/projects/${horizSlug}')`
  });
  await sleep(2500);

  const shotHorizontal = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'aspect_03_horizontal_detail.png'), Buffer.from(shotHorizontal.data, 'base64'));
  console.log('Captured aspect_03_horizontal_detail.png');

  // Clear test dummy cards
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
