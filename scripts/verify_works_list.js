const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-test-list');
const outDir = path.join('C:', 'Users', 'mohit', '.gemini', 'antigravity-ide', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6');

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

  const pageTab = tabs.find(t => t.id === targetId) || tabs.find(t => t.url.includes('3000/works')) || tabs[0];
  console.log('Selected target tab:', pageTab.url, 'id:', pageTab.id);
  const pageWs = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(res => pageWs.onopen = res);

  pageWs.send(JSON.stringify({ id: 10, method: 'Page.enable' }));
  pageWs.send(JSON.stringify({ id: 11, method: 'Runtime.enable' }));
  pageWs.send(JSON.stringify({
    id: 12,
    method: 'Emulation.setDeviceMetricsOverride',
    params: { width: 1600, height: 950, deviceScaleFactor: 1, mobile: false }
  }));

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

  function screenshot(filename) {
    const id = ++msgId;
    return new Promise(res => {
      const handler = (m) => {
        const p = JSON.parse(m.data);
        if (p.id === id) {
          pageWs.removeEventListener('message', handler);
          const buf = Buffer.from(p.result.data, 'base64');
          const fullPath = path.join(outDir, filename);
          fs.writeFileSync(fullPath, buf);
          console.log('Saved:', filename);
          res(fullPath);
        }
      };
      pageWs.addEventListener('message', handler);
      pageWs.send(JSON.stringify({ id, method: 'Page.captureScreenshot', params: { format: 'png' } }));
    });
  }

  // Poll until app is ready
  for (let i = 0; i < 40; i++) {
    const ready = await evalPage("document.getElementById('boot-loader')?.style?.display === 'none'");
    if (ready) break;
    await sleep(300);
  }

  await sleep(1500);

  // 1. Switch to LIST view
  console.log('Switching to LIST view...');
  await evalPage("document.getElementById('works-list-btn').click();");
  await sleep(1000);

  // Check state of list view
  const listInfo = await evalPage(`
    (() => {
      const items = Array.from(document.querySelectorAll('.works-list__item'));
      const chars = Array.from(document.querySelectorAll('.works-list__char'));
      const previewImg = document.querySelector('.works-list__preview-image');
      return JSON.stringify({
        itemCount: items.length,
        firstTitle: items[0]?.textContent?.trim(),
        charCount: chars.length,
        previewSrc: previewImg?.src ? previewImg.src.substring(0, 60) : 'none'
      });
    })()
  `);
  console.log('List info:', listInfo);

  // Capture authentic list view
  await screenshot('works_list_view_authentic.png');

  // 2. Test Letter Breakdown interaction on touch / pointer
  console.log('Testing letter breakdown on touch...');
  const firstItem = await evalPage(`
    (() => {
      const item = document.querySelector('.works-list__item');
      if (!item) return null;
      const rect = item.getBoundingClientRect();
      return { x: rect.left + rect.width * 0.4, y: rect.top + rect.height * 0.5 };
    })()
  `);

  if (firstItem) {
    pageWs.send(JSON.stringify({
      id: 60,
      method: 'Input.dispatchMouseEvent',
      params: { type: 'mousePressed', x: firstItem.x, y: firstItem.y, button: 'left', clickCount: 1 }
    }));
    await sleep(150);
  }

  const breakdownInfo = await evalPage(`
    (() => {
      const ch = document.querySelector('.works-list__char');
      return ch ? {
        touchX: ch.style.getPropertyValue('--char-touch-x'),
        touchY: ch.style.getPropertyValue('--char-touch-y'),
        touchR: ch.style.getPropertyValue('--char-touch-r')
      } : null;
    })()
  `);
  console.log('Breakdown glyph info:', breakdownInfo);

  await screenshot('works_list_letter_breakdown.png');

  // Release mouse
  if (firstItem) {
    pageWs.send(JSON.stringify({
      id: 61,
      method: 'Input.dispatchMouseEvent',
      params: { type: 'mouseReleased', x: firstItem.x, y: firstItem.y, button: 'left' }
    }));
  }
  await sleep(400);

  // 3. Test Category Filtering in List View
  console.log('Testing category filtering in list view (Editorial)...');
  await evalPage("document.getElementById('works-filter-pill').click();");
  await sleep(500);

  await evalPage(`
    (() => {
      const btn = Array.from(document.querySelectorAll('.works-filter__btn')).find(b => b.textContent.toLowerCase().includes('editorial'));
      if (btn) btn.click();
    })()
  `);
  await sleep(1000);

  const filteredInfo = await evalPage(`
    (() => {
      const items = Array.from(document.querySelectorAll('.works-list__item'));
      return JSON.stringify({
        itemCount: items.length,
        titles: items.map(it => it.textContent.trim())
      });
    })()
  `);
  console.log('Filtered Editorial list info:', filteredInfo);

  await screenshot('works_list_filtered_editorial.png');

  // 4. Test Scroll Velocity Curving
  console.log('Testing scroll curving physics...');
  // Scroll down a bit
  pageWs.send(JSON.stringify({
    id: 70,
    method: 'Input.dispatchMouseEvent',
    params: { type: 'mouseWheel', x: 400, y: 400, deltaX: 0, deltaY: 350 }
  }));
  await sleep(150);
  await screenshot('works_list_scrolling_curve.png');

  pageWs.close();
  bws.close();
  chrome.kill();
  console.log('All Works List verification complete!');
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  chrome.kill();
  process.exit(1);
});
