const https = require('https');

const files = [
  '/_nuxt/Du7_eDLQ.js',
  '/_nuxt/DURsIwpm.js',
  '/_nuxt/CLfRUiZo.js',
  '/_nuxt/xJWIROHs.js',
  '/_nuxt/DlLyP0KD.js',
  '/_nuxt/tDcpOAvj.js',
  '/_nuxt/DG0sDIxs.js'
];

async function run() {
  for (const f of files) {
    await new Promise(resolve => {
      https.get('https://k95.it' + f, r => {
        let b = '';
        r.on('data', c => b += c);
        r.on('end', () => {
          const glbMatches = b.match(/["'][^"']+\.glb["']/g);
          if (glbMatches) console.log(f, 'GLBs:', glbMatches);
          const d3Matches = b.match(/["'][^"']*\/3d\/[^"']*["']/g);
          if (d3Matches) console.log(f, '3D paths:', d3Matches);
          resolve();
        });
      });
    });
  }
}

run();
