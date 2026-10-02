const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-fresh-profile');
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
    bws.onmessage = m => res(JSON.parse(m.data));
    bws.send(JSON.stringify({
      id: 1,
      method: 'Target.createTarget',
      params: { url: 'http://localhost:3000/works' }
    }));
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

  const pageTab = tabs.find(t => t.id === targetId || t.url.includes('3000/works'));
  const pageWs = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(res => pageWs.onopen = res);

  pageWs.send(JSON.stringify({ id: 10, method: 'Page.enable' }));
  pageWs.send(JSON.stringify({ id: 11, method: 'Runtime.enable' }));
  pageWs.send(JSON.stringify({
    id: 12,
    method: 'Emulation.setDeviceMetricsOverride',
    params: { width: 1600, height: 950, deviceScaleFactor: 1, mobile: false }
  }));

  function evalPage(expr) {
    return new Promise(res => {
      const handler = (m) => {
        const p = JSON.parse(m.data);
        if (p.id === 99) {
          pageWs.removeEventListener('message', handler);
          res(p.result?.result?.value);
        }
      };
      pageWs.addEventListener('message', handler);
      pageWs.send(JSON.stringify({ id: 99, method: 'Runtime.evaluate', params: { expression: expr } }));
    });
  }

  function screenshot(filename) {
    return new Promise(res => {
      const handler = (m) => {
        const p = JSON.parse(m.data);
        if (p.id === 88) {
          pageWs.removeEventListener('message', handler);
          const buf = Buffer.from(p.result.data, 'base64');
          const fullPath = path.join(outDir, filename);
          fs.writeFileSync(fullPath, buf);
          console.log('Saved:', filename);
          res(fullPath);
        }
      };
      pageWs.addEventListener('message', handler);
      pageWs.send(JSON.stringify({ id: 88, method: 'Page.captureScreenshot', params: { format: 'png' } }));
    });
  }

  // Poll until ready
  for (let i = 0; i < 40; i++) {
    const ready = await evalPage("document.getElementById('boot-loader')?.style?.display === 'none' && !!document.querySelector('.works-canvas')");
    if (ready) break;
    await sleep(300);
  }

  await sleep(1500);

  // 1. Initial 3D Grid Overview
  await screenshot('works_3d_grid_overview.png');

  // 2. Open filter dropdown
  await evalPage("document.getElementById('works-filter-pill').click();");
  await sleep(600);
  await screenshot('works_3d_filter_dropdown.png');

  // 3. Click 'Editorial' category filter
  await evalPage(`
    (() => {
      const btn = Array.from(document.querySelectorAll('.works-filter__btn')).find(b => b.textContent.toLowerCase().includes('editorial'));
      if (btn) btn.click();
    })()
  `);
  await sleep(1000);
  await screenshot('works_3d_filter_applied.png');

  // Reset to ALL
  await evalPage(`
    (() => {
      document.getElementById('works-filter-pill').click();
      setTimeout(() => {
        const allBtn = document.querySelector('.works-filter__btn[data-cat=\"all\"]');
        if (allBtn) allBtn.click();
      }, 200);
    })()
  `);
  await sleep(1000);

  // 4. Move mouse over center card to trigger hover label and forward bend
  pageWs.send(JSON.stringify({
    id: 60,
    method: 'Input.dispatchMouseEvent',
    params: { type: 'mouseMoved', x: 620, y: 350 }
  }));
  await sleep(800);
  await screenshot('works_3d_card_hover.png');

  // 5. Switch to List view
  await evalPage("document.getElementById('works-list-btn').click();");
  await sleep(1000);
  await screenshot('works_list_view_exact.png');

  pageWs.close();
  bws.close();
  chrome.kill();
  console.log('All verification captures completed successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  chrome.kill();
  process.exit(1);
});
