const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function run() {
  const page = await fetch('https://k95.it/en/studio');
  const jsFiles = [...page.body.matchAll(/src="(\/_nuxt\/[^"]+\.js)"/g)].map(m => 'https://k95.it' + m[1]);
  console.log('Found JS files:', jsFiles.length);

  for (const jsUrl of jsFiles) {
    const js = await fetch(jsUrl);
    const glbs = [...js.body.matchAll(/["']([^"']+\.glb[^"']*)["']/g)].map(m => m[1]);
    if (glbs.length > 0) {
      console.log('Found GLB in', jsUrl, glbs);
    }
    // Also check for 3d path matches
    const d3 = [...js.body.matchAll(/["'](\/3d\/[^"']+)["']/g)].map(m => m[1]);
    if (d3.length > 0) {
      console.log('Found /3d/ path in', jsUrl, d3);
    }
  }
}

run();
