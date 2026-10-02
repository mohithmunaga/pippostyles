const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.join(__dirname, '..', '.chrome-debug-err-' + Date.now());

const chrome = spawn(chromePath, [
  '--remote-debugging-port=9701',
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
    http.get('http://127.0.0.1:9701/json/version', r => {
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
    http.get('http://127.0.0.1:9701/json', r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const pageTab = tabs.find(t => t.id === targetId) || tabs[0];
  const pageWs = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(res => pageWs.onopen = res);

  let msgId = 10;
  const consoleMessages = [];
  const runtimeExceptions = [];
  const networkFailures = [];

  pageWs.addEventListener('message', (e) => {
    const data = JSON.parse(e.data);
    if (data.method === 'Console.messageAdded') {
      consoleMessages.push(data.params.message);
    } else if (data.method === 'Runtime.consoleAPICalled') {
      consoleMessages.push({
        type: data.params.type,
        args: data.params.args.map(a => a.value || a.description)
      });
    } else if (data.method === 'Runtime.exceptionThrown') {
      runtimeExceptions.push(data.params.exceptionDetails);
    } else if (data.method === 'Network.loadingFailed') {
      networkFailures.push(data.params);
    }
  });

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
  await send('Console.enable');
  await send('Network.enable');

  await sleep(4000);

  const pageEval = await send('Runtime.evaluate', {
    expression: `
      ({
        url: window.location.href,
        title: document.title,
        bodyLen: document.body.innerHTML.length,
        hasWebGL: !!window.THREE,
        activeRoute: window.currentRoute || 'unknown',
        loaderDisplay: document.getElementById('boot-loader')?.style.display,
        loaderClass: document.getElementById('boot-loader')?.className,
        appPageLen: document.getElementById('app-page')?.innerHTML.length
      })
    `,
    returnByValue: true
  });

  console.log('=== PAGE EVALUATION ===');
  console.log(JSON.stringify(pageEval.result.value, null, 2));

  console.log('=== RUNTIME EXCEPTIONS ===');
  console.log(JSON.stringify(runtimeExceptions, null, 2));

  console.log('=== CONSOLE MESSAGES ===');
  console.log(JSON.stringify(consoleMessages, null, 2));

  console.log('=== NETWORK FAILURES ===');
  console.log(JSON.stringify(networkFailures, null, 2));

  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'brain', '49ab7651-6fbf-435b-bbac-8821e62d0bc6', 'debug_site_error_screen.png'), Buffer.from(screenshot.data, 'base64'));
  console.log('Captured debug_site_error_screen.png');

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
