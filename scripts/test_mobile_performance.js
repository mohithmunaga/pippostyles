const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-perf-' + Date.now());
const chrome = spawn(chromePath, [
  '--remote-debugging-port=9724',
  '--headless=new',
  '--window-size=400,900',
  '--user-data-dir=' + profileDir
]);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  await sleep(2500);

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9724/json', r => {
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

  // Emulate mobile device (iPhone 14 Pro)
  await send('Emulation.setDeviceMetricsOverride', {
    width: 393,
    height: 852,
    deviceScaleFactor: 3,
    mobile: true,
    touch: true
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });

  console.log('Navigating to Mobile Home (3D Space)...');
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await sleep(3500);

  // Measure animation frame performance on 3D Space
  const homeFps = await send('Runtime.evaluate', {
    expression: `
      new Promise(resolve => {
        let frames = 0;
        const start = performance.now();
        function check() {
          frames++;
          if (performance.now() - start < 1000) {
            requestAnimationFrame(check);
          } else {
            resolve({
              fps: Math.round((frames * 1000) / (performance.now() - start)),
              pixelRatio: window.devicePixelRatio,
              innerWidth: window.innerWidth,
              dprUsed: window.__webglPixelRatio || 'optimized'
            });
          }
        }
        requestAnimationFrame(check);
      })
    `,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Home 3D Space Performance:', homeFps?.result?.value);

  const shotHome = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', 'afce3e2c-a225-47b2-9628-ec4da88029b0', 'mobile_perf_home.png'), Buffer.from(shotHome.data, 'base64'));

  // Navigate to Works List (/works?view=list)
  console.log('Navigating to All Pics (1,349 photos list)...');
  await send('Runtime.evaluate', { expression: `window.navigateTo('/works?view=list')` });
  await sleep(2500);

  // Simulate fast touch scroll through 1,349 photos and measure frame rate
  const listFps = await send('Runtime.evaluate', {
    expression: `
      new Promise(resolve => {
        let frames = 0;
        let scrollY = 0;
        const start = performance.now();
        function scrollStep() {
          frames++;
          scrollY += 35;
          window.scrollTo(0, scrollY);
          if (performance.now() - start < 1500) {
            requestAnimationFrame(scrollStep);
          } else {
            resolve({
              fps: Math.round((frames * 1000) / (performance.now() - start)),
              totalItems: document.querySelectorAll('.works-list__item').length,
              scrollY: window.scrollY
            });
          }
        }
        requestAnimationFrame(scrollStep);
      })
    `,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Works List (1,349 photos) Performance under fast scroll:', listFps?.result?.value);

  const shotList = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', 'afce3e2c-a225-47b2-9628-ec4da88029b0', 'mobile_perf_list.png'), Buffer.from(shotList.data, 'base64'));

  pageWs.close();
  chrome.kill();
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) {}
}

run().catch(e => {
  console.error(e);
  chrome.kill();
});
