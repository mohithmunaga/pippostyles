const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-studio-verify-' + Date.now());

const chrome = spawn(chromePath, [
  '--remote-debugging-port=9681',
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
    http.get('http://127.0.0.1:9681/json/version', r => {
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
    http.get('http://127.0.0.1:9681/json', r => {
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

  console.log('Waiting for Story page to mount and animate...');
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
  await sleep(1500);

  // 1. Screenshot of Story Hero with blink / phosphor animation
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  const dest1 = path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'studio_hero.png');
  fs.writeFileSync(dest1, Buffer.from(shot1.data, 'base64'));
  console.log('Saved studio_hero.png');

  // 2. Scroll to Inverted Cook section and click 2nd chapter accordion
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const cook = document.querySelector('.studio-cook');
        if (cook) cook.scrollIntoView({ behavior: 'instant' });
        const secondRow = document.querySelector('.studio-services__row[data-chapter-idx="1"]');
        if (secondRow) secondRow.click();
      })()
    `
  });
  await sleep(800);

  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  const dest2 = path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'studio_cook_chapters.png');
  fs.writeFileSync(dest2, Buffer.from(shot2.data, 'base64'));
  console.log('Saved studio_cook_chapters.png');

  // 3. Scroll to Milestones and Footer
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const awards = document.querySelector('.studio-awards');
        if (awards) awards.scrollIntoView({ behavior: 'instant' });
      })()
    `
  });
  await sleep(800);

  const shot3 = await send('Page.captureScreenshot', { format: 'png' });
  const dest3 = path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'studio_milestones_footer.png');
  fs.writeFileSync(dest3, Buffer.from(shot3.data, 'base64'));
  console.log('Saved studio_milestones_footer.png');

  const evalInfo = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const heroLine = document.querySelector('.studio-hero__line')?.textContent;
        const footerMeta = Array.from(document.querySelectorAll('.studio-hero__footer span')).map(s => s.textContent);
        const leadStoryP = Array.from(document.querySelectorAll('.studio-hero__body p')).map(p => p.textContent.slice(0, 50) + '...');
        const chapterTitles = Array.from(document.querySelectorAll('.studio-services__name span:first-child')).map(s => s.textContent);
        const footerText = document.querySelector('.studio-footer__bottom-row')?.textContent;
        return {
          heroLine,
          footerMeta,
          leadStoryP,
          chapterTitles,
          footerText
        };
      })()
    `,
    returnByValue: true
  });
  console.log('STUDIO EVAL RESULT:', JSON.stringify(evalInfo.result.value, null, 2));

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
