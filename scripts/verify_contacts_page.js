const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-contacts-' + Date.now());

const chrome = spawn(chromePath, [
  '--remote-debugging-port=9677',
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
    http.get('http://127.0.0.1:9677/json/version', r => {
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
      params: { url: 'http://localhost:3000/contacts' }
    }));
    bws.onmessage = m => res(JSON.parse(m.data));
  });

  const targetId = targetResp.result.targetId;
  await sleep(500);

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9677/json', r => {
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

  pageWs.addEventListener('message', (e) => {
    const data = JSON.parse(e.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      console.log('[BROWSER CONSOLE]', data.params.type, JSON.stringify(data.params.args));
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]', JSON.stringify(data.params.exceptionDetails));
    }
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1600,
    height: 950,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log('Waiting for boot loader and contact 3D scene to initialize...');
  await sleep(4500);

  const evalRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const heroH1 = document.querySelector('.contacts-hero__line')?.textContent;
        const canvas = document.querySelector('.contacts-canvas');
        const scrollLabel = document.getElementById('contacts-scroll-label');
        const heroLink = document.querySelector('.studio-footer__hero-link')?.textContent?.trim();
        const creatorTag = document.querySelector('.studio-footer__creator-tag')?.textContent?.trim();
        const menuLinks = Array.from(document.querySelectorAll('.studio-footer__menu-link')).map(a => a.textContent.trim());

        return {
          heroH1,
          hasCanvas: !!canvas,
          canvasRevealed: canvas ? canvas.classList.contains('is-revealed') : false,
          canvasSize: canvas ? { width: canvas.width, height: canvas.height } : null,
          scrollLabelExists: !!scrollLabel,
          heroLink,
          creatorTag,
          menuLinks
        };
      })()
    `,
    returnByValue: true
  });

  console.log('CONTACTS PAGE EVAL RESULT:\n', JSON.stringify(evalRes.result.value, null, 2));

  // Capture Hero Screenshot
  const heroShot = await send('Page.captureScreenshot', { format: 'png' });
  const heroDest = path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'contacts_hero_3d.png');
  fs.writeFileSync(heroDest, Buffer.from(heroShot.data, 'base64'));
  console.log('Saved hero screenshot to contacts_hero_3d.png');

  // Trigger Mouse Move over Hero to test SCROLL label
  await send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: 800,
    y: 450
  });
  await sleep(400);

  const hoverEval = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const l = document.getElementById('contacts-scroll-label');
        return {
          isVisible: l ? l.classList.contains('is-visible') : false,
          left: l ? l.style.left : null,
          top: l ? l.style.top : null
        };
      })()
    `,
    returnByValue: true
  });
  console.log('HOVER SCROLL LABEL STATUS:\n', JSON.stringify(hoverEval.result.value, null, 2));

  // Scroll down to Footer
  await send('Runtime.evaluate', {
    expression: 'window.scrollTo({ top: 850, behavior: "instant" })'
  });
  await sleep(800);

  const footerShot = await send('Page.captureScreenshot', { format: 'png' });
  const footerDest = path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'contacts_footer_dark.png');
  fs.writeFileSync(footerDest, Buffer.from(footerShot.data, 'base64'));
  console.log('Saved footer screenshot to contacts_footer_dark.png');

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
