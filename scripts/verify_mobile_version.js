const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-mobile-test-' + Date.now());

const chrome = spawn(chromePath, [
  '--remote-debugging-port=9693',
  '--headless=new',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=390,844',
  '--user-data-dir=' + profileDir
]);

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function run() {
  await sleep(1500);

  const ver = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9693/json/version', r => {
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
      params: { url: 'http://localhost:3000/' }
    }));
    bws.onmessage = m => res(JSON.parse(m.data));
  });

  const targetId = targetResp.result.targetId;
  await sleep(500);

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9693/json', r => {
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
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
    hasTouch: true
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });

  // 1. Mobile Home View
  await sleep(3500);
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'mobile_01_home.png'), Buffer.from(shot1.data, 'base64'));
  console.log('Captured mobile_01_home.png');

  // 2. Open Mobile Menu
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.getElementById('menu-toggle-btn');
        if (btn) btn.click();
      })()
    `
  });
  await sleep(600);

  const shotMenu = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'mobile_02_menu_open.png'), Buffer.from(shotMenu.data, 'base64'));
  console.log('Captured mobile_02_menu_open.png');

  // 3. Tap "Story" Link in Mobile Menu
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const link = document.getElementById('mobile-link-studio');
        if (link) link.click();
      })()
    `
  });
  await sleep(2000);

  const shotStory = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'mobile_03_story_hero.png'), Buffer.from(shotStory.data, 'base64'));
  console.log('Captured mobile_03_story_hero.png');

  // Scroll down in Story page to view chapters & philosophy
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 1100);' });
  await sleep(600);

  const shotStoryCook = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'mobile_04_story_chapters.png'), Buffer.from(shotStoryCook.data, 'base64'));
  console.log('Captured mobile_04_story_chapters.png');

  // 4. Open Menu & Tap "All Pics" (Works)
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        document.getElementById('menu-toggle-btn')?.click();
      })()
    `
  });
  await sleep(500);

  await send('Runtime.evaluate', {
    expression: `
      (() => {
        document.getElementById('mobile-link-works')?.click();
      })()
    `
  });
  await sleep(2000);

  const shotWorks = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'mobile_05_works.png'), Buffer.from(shotWorks.data, 'base64'));
  console.log('Captured mobile_05_works.png');

  // Open Category Popup on Mobile Works
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        document.getElementById('works-filter-pill')?.click();
      })()
    `
  });
  await sleep(500);

  const shotCategoryPopup = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'mobile_06_category_modal.png'), Buffer.from(shotCategoryPopup.data, 'base64'));
  console.log('Captured mobile_06_category_modal.png');

  // 5. Open Menu & Tap "Contact"
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        document.getElementById('works-filter-close')?.click();
        document.getElementById('menu-toggle-btn')?.click();
      })()
    `
  });
  await sleep(500);

  await send('Runtime.evaluate', {
    expression: `
      (() => {
        document.getElementById('mobile-link-contacts')?.click();
      })()
    `
  });
  await sleep(2500);

  const shotContacts = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'mobile_07_contacts.png'), Buffer.from(shotContacts.data, 'base64'));
  console.log('Captured mobile_07_contacts.png');

  // Scroll down to contact footer on mobile
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, document.body.scrollHeight);' });
  await sleep(800);

  const shotContactsFooter = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'mobile_08_contacts_footer.png'), Buffer.from(shotContactsFooter.data, 'base64'));
  console.log('Captured mobile_08_contacts_footer.png');

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
