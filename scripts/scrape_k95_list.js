const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-k95-scrape');

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
      params: { url: 'https://k95.it/en/works' }
    }));
  });

  const targetId = targetResp.result.targetId;
  await sleep(1000);

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const pageTab = tabs.find(t => t.id === targetId || t.url.includes('k95.it'));
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

  console.log('Waiting for k95.it to load and preloader to finish...');
  await sleep(4000);

  // Click LIST button
  console.log('Clicking LIST on k95.it...');
  const clicked = await evalPage(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const listBtn = btns.find(b => b.textContent.trim().toLowerCase() === 'list');
      if (listBtn) {
        listBtn.click();
        return 'clicked list btn';
      }
      return 'list btn not found, btns: ' + btns.map(b => b.textContent.trim()).join('|');
    })()
  `);
  console.log('Clicked result:', clicked);

  await sleep(2500);

  // Extract all stylesheets and rules matching works-list
  const data = await evalPage(`
    (() => {
      const rules = [];
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.cssText && (rule.cssText.includes('works-list') || rule.cssText.includes('96def13c'))) {
              rules.push(rule.cssText);
            }
          }
        } catch(e) {}
      }

      const listEl = document.querySelector('.works-list') || document.querySelector('[class*="works-list"]');
      const itemEl = document.querySelector('.works-list__item');
      const charEl = document.querySelector('.works-list__char');
      const previewEl = document.querySelector('.works-list__preview-shell') || document.querySelector('.works-list__preview');

      function getStyles(el) {
        if (!el) return null;
        const cs = window.getComputedStyle(el);
        return {
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
          textTransform: cs.textTransform,
          color: cs.color,
          display: cs.display,
          alignItems: cs.alignItems,
          justifyContent: cs.justifyContent,
          position: cs.position,
          transform: cs.transform,
          transition: cs.transition,
          cursor: cs.cursor,
          padding: cs.padding,
          margin: cs.margin,
          width: cs.width,
          height: cs.height
        };
      }

      return JSON.stringify({
        rulesCount: rules.length,
        rules: rules,
        listHtml: listEl ? listEl.outerHTML.substring(0, 3000) : 'no listEl',
        listStyles: getStyles(listEl),
        itemStyles: getStyles(itemEl),
        charStyles: getStyles(charEl),
        previewStyles: getStyles(previewEl)
      }, null, 2);
    })()
  `);

  fs.writeFileSync('./scripts/k95_live_list_data.json', data);
  console.log('Saved k95 live list data! Length:', data.length);

  // Also take screenshot of real k95 list
  const ss = await new Promise(res => {
    const handler = (m) => {
      const p = JSON.parse(m.data);
      if (p.id === 88) {
        pageWs.removeEventListener('message', handler);
        res(p.result.data);
      }
    };
    pageWs.addEventListener('message', handler);
    pageWs.send(JSON.stringify({ id: 88, method: 'Page.captureScreenshot', params: { format: 'png' } }));
  });

  const buf = Buffer.from(ss, 'base64');
  fs.writeFileSync('C:\\Users\\mohit\\.gemini\\antigravity-ide\\brain\\49ab7651-6fbf-435b-bbac-8821e62d0bc6\\k95_real_list_view.png', buf);
  console.log('Saved k95 real list screenshot!');

  pageWs.close();
  bws.close();
  chrome.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  chrome.kill();
  process.exit(1);
});
