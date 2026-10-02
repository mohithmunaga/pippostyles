const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://k95.it/3d/letter/letter.glb';
const dest = path.join(__dirname, '..', 'assets', '3d', 'letter.glb');

const file = fs.createWriteStream(dest);
https.get(url, (res) => {
  if (res.statusCode === 200) {
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Successfully downloaded letter.glb (' + fs.statSync(dest).size + ' bytes)');
    });
  } else {
    console.error('Failed with status:', res.statusCode);
  }
}).on('error', (err) => {
  console.error('Error downloading:', err);
});
