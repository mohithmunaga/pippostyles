const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-user-verify-' + Date.now());

const chrome = spawn(chromePath, [
  '--remote-debugging-port=9685',
  '--headless=new',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1600,950',
  '--user-data-dir=' + profileDir
]);

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function run() {
  await sleep(1500);

  const ver = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9685/json/version', r => {
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
      params: { url: 'http://localhost:3000/studio' }
    }));
    bws.onmessage = m => res(JSON.parse(m.data));
  });

  const targetId = targetResp.result.targetId;
  await sleep(500);

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9685/json', r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const pageTab = tabs.find(t => t.id === targetId) || tabs[0];
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
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1600,
    height: 950,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Wait for Story page
  await send('Runtime.evaluate', {
    expression: `
      new Promise(resolve => {
        const interval = setInterval(() => {
          if (document.querySelector('.studio')) {
            clearInterval(interval);
            resolve(true);
          }
        }, 100);
      })
    `,
    awaitPromise: true
  });
  await sleep(3500);

  // 1. Capture Story Page 100vh Full Screen with 3D model in center
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  const dest1 = path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'story_full_page_3d_hero.png');
  fs.writeFileSync(dest1, Buffer.from(shot1.data, 'base64'));
  console.log('Saved story_full_page_3d_hero.png');

  // Test scroll down and scroll up reveal
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 800);' });
  await sleep(600);
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0);' });
  await sleep(800);

  const shot1b = await send('Page.captureScreenshot', { format: 'png' });
  const dest1b = path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'story_scroll_up_revealed.png');
  fs.writeFileSync(dest1b, Buffer.from(shot1b.data, 'base64'));
  console.log('Saved story_scroll_up_revealed.png');

  // 2. Navigate to Works page and open Category Filter Modal (pic2 test)
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        window.history.pushState(null, '', '/works');
        window.dispatchEvent(new PopStateEvent('popstate'));
      })()
    `
  });
  await sleep(1500);

  // Click filter pill to open the category popup modal
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const pill = document.getElementById('works-filter-pill');
        if (pill) pill.click();
      })()
    `
  });
  await sleep(600);

  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  const dest2 = path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'works_category_popup_pic2_match.png');
  fs.writeFileSync(dest2, Buffer.from(shot2.data, 'base64'));
  console.log('Saved works_category_popup_pic2_match.png');

  const categoriesEval = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('.works-filter__btn')).map(b => b.textContent.trim().replace(/\\s+/g, ' '));
        const isOpen = document.getElementById('works-filter-pill')?.classList.contains('is-open');
        return { isOpen, buttons };
      })()
    `,
    returnByValue: true
  });
  console.log('CATEGORIES EVAL:', JSON.stringify(categoriesEval.result.value, null, 2));

  bws.close();
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
