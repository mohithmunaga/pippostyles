const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-perf-' + Date.now());
const chrome = spawn(chromePath, ['--remote-debugging-port=9712', '--headless=new', '--window-size=1600,1000', '--user-data-dir=' + profileDir]);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  await sleep(2500);

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9712/json', r => {
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
  await sleep(3500);

  const fpsEval = await send('Runtime.evaluate', {
    expression: `
      new Promise((resolve) => {
        let frameCount = 0;
        let start = performance.now();
        function count() {
          frameCount++;
          if (performance.now() - start < 1000) {
            requestAnimationFrame(count);
          } else {
            const actualFps = Math.round((frameCount * 1000) / (performance.now() - start));
            resolve({ fps: actualFps, frameCount });
          }
        }
        requestAnimationFrame(count);
      })
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('FPS Measurement:', JSON.stringify(fpsEval?.result?.value, null, 2));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'k95_smooth_entry_verified.png'), Buffer.from(shot.data, 'base64'));
  console.log('Captured k95_smooth_entry_verified.png');

  pageWs.close(); chrome.kill();
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch(e){}
}

run().catch(e => { console.error(e); chrome.kill(); });
