const https = require('https');

const candidates = [
  'https://k95.it/3d/totem/totem.glb',
  'https://k95.it/3d/studio/studio.glb',
  'https://k95.it/3d/studio.glb',
  'https://k95.it/3d/k95/k95.glb',
  'https://k95.it/3d/k95.glb',
  'https://k95.it/3d/logo/logo.glb',
  'https://k95.it/3d/logo.glb',
  'https://k95.it/3d/cubes/cubes.glb',
  'https://k95.it/3d/grid/grid.glb',
  'https://k95.it/3d/icon/icon.glb'
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      console.log(res.statusCode, url, res.headers['content-type'], res.headers['content-length']);
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });
}

async function run() {
  for (const url of candidates) {
    await checkUrl(url);
  }
}

run();
