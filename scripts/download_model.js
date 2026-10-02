import https from 'https';
import fs from 'fs';

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else {
        reject(new Error(`Failed with status ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function run() {
  console.log('Downloading https://k95.it/3d/rosa.glb ...');
  try {
    fs.mkdirSync('./assets/3d', { recursive: true });
    await downloadFile('https://k95.it/3d/rosa.glb', './assets/3d/rosa.glb');
    const stats = fs.statSync('./assets/3d/rosa.glb');
    console.log('Successfully downloaded rosa.glb, size:', stats.size);
  } catch(e) {
    console.error('Error:', e.message);
  }
}

run();
