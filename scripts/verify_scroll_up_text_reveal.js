const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-reveal-test-' + Date.now());

const chrome = spawn(chromePath, [
  '--remote-debugging-port=9689',
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
    http.get('http://127.0.0.1:9689/json/version', r => {
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
    http.get('http://127.0.0.1:9689/json', r => {
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

  // Wait 3.5s for boot and reveal
  await sleep(3500);

  // 1. Initial State of Story Hero
  const heroInitial = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const chars = Array.from(document.querySelectorAll('.studio-hero__line .gsap-char-reveal')).map(c => ({
          char: c.textContent.trim(),
          transform: window.getComputedStyle(c).transform,
          opacity: window.getComputedStyle(c).opacity
        }));
        return { count: chars.length, chars };
      })()
    `,
    returnByValue: true
  });
  console.log('STORY HERO INITIAL (FULLY REVEALED):', JSON.stringify(heroInitial.result.value, null, 2));

  // 2. Scroll Down past the hero into chapters/milestones
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 1400);' });
  await sleep(600);

  // 3. Scroll UP back towards the hero
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0);' });
  await sleep(800); // Allow smooth CSS transition to finish

  const heroScrollUp = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const hero = document.querySelector('.studio-hero');
        const isRevealed = hero?.classList.contains('is-revealed');
        const chars = Array.from(document.querySelectorAll('.studio-hero__line .gsap-char-reveal')).map(c => ({
          char: c.textContent.trim(),
          transform: window.getComputedStyle(c).transform,
          opacity: window.getComputedStyle(c).opacity
        }));
        return { isRevealed, chars };
      })()
    `,
    returnByValue: true
  });
  console.log('STORY HERO ON SCROLL UP (FULLY REVEALED):', JSON.stringify(heroScrollUp.result.value, null, 2));

  // Capture screenshot after scroll up reveal
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  const dest1 = path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'story_scroll_up_text_revealed_final.png');
  fs.writeFileSync(dest1, Buffer.from(shot1.data, 'base64'));

  // 4. Test Contacts Page Scroll Up Reveal
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        window.history.pushState(null, '', '/contacts');
        window.dispatchEvent(new PopStateEvent('popstate'));
      })()
    `
  });
  await sleep(1500);

  // Scroll down then scroll up
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 900);' });
  await sleep(400);
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0);' });
  await sleep(800);

  const contactScrollUp = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const contactHero = document.querySelector('.contacts-hero');
        const isRevealed = contactHero?.classList.contains('is-revealed');
        const chars = Array.from(document.querySelectorAll('.contacts-hero__line .gsap-char-reveal')).map(c => ({
          char: c.textContent.trim(),
          transform: window.getComputedStyle(c).transform,
          opacity: window.getComputedStyle(c).opacity
        }));
        return { isRevealed, chars };
      })()
    `,
    returnByValue: true
  });
  console.log('CONTACT HERO ON SCROLL UP (FULLY REVEALED):', JSON.stringify(contactScrollUp.result.value, null, 2));

  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  const dest2 = path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'contacts_scroll_up_text_revealed_final.png');
  fs.writeFileSync(dest2, Buffer.from(shot2.data, 'base64'));

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
