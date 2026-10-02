const fs = require('fs');
const path = require('path');
const https = require('https');

// Target directories
const fontDir = path.join(__dirname, '..', 'assets', 'fonts');
const r2Dir = path.join(__dirname, '..', 'assets', 'r2');

// Ensure directories exist
fs.mkdirSync(fontDir, { recursive: true });
fs.mkdirSync(r2Dir, { recursive: true });

const fontUrl = 'https://k95.it/_nuxt/adaptive.BWbb4rbN.woff2';
const logoUrl = 'https://k95.it/r2/Logo_286f9ecac6.svg';

const smallCovers = [
  'small_cover_9f63b925ac.webp',
  'small_coveramts_0ed2147794.webp',
  'small_Frame_47_b43c8446df.webp',
  'small_Frame_55_d1b9c06478.webp',
  'small_Frame_54_result_cb2c59b7b4.webp',
  'small_Frame_67_cf6bf1ed7b.webp',
  'small_Frame_62_fd64a2478f.webp',
  'small_Frame_71_result_40d0807ab3.webp',
  'small_cover_d4ed900b57.jpg',
  'small_OD_result_e11bf9e2e6.webp',
  'small_cover_6cc5e46bed.jpg',
  'small_cover_result_844388a4d0.webp',
  'small_Marocco_18112fcea6.webp',
  'small_cover_2951a37252.webp',
  'small_cover_result_9dbc845c2b.webp',
  'small_cover_f3fc78436b.webp',
  'small_cover_result_a4dd376436.webp',
  'small_cover_result_c45847d45a.webp',
  'small_cover_feff9a3847.webp',
  'small_fantoni_result_c327b5af5b.webp'
];

const largeCovers = smallCovers.map(name => name.replace('small_', 'large_'));

// Additional inner assets for the showcase project: MN
const mnInnerAssets = [
  'MN_Logo_5cfe018111.webp',
  'targa_1b0ba61770.webp',
  'biglietti_e833722bb2.webp',
  'mn_21644460d6.webp',
  'logo_animation_0f7005000d.mp4',
  'moto_corsa_ce5d0ef6f4.jpg',
  'video_adv_9ab46a99c8.mp4',
  'mn_adv_1cd58c91c5.webp',
  'pack_75d2ce1b57.webp',
  'pack_full_5e805a8d8b.webp',
  'packaging_aperto_e7df64452b.webp',
  'pack_multi_4b70d9ee58.jpg',
  'compressed_video_e11522fbda.mp4',
  'Frame_76_248bf309f5.webp',
  'Frame_77_e1bfe20e06.webp',
  '1045_840985f329.webp',
  'mn_one_50311c51dd.webp'
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    // If file exists, skip
    if (fs.existsSync(dest)) {
      console.log(`Skipped existing: ${path.basename(dest)}`);
      return resolve();
    }

    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        // Some formats might not match directly, log it
        console.warn(`Failed to download ${path.basename(dest)}: Status Code ${response.statusCode}`);
        file.close();
        fs.unlinkSync(dest);
        return resolve(); // Resolve anyway to not block the script
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      console.error(`Error downloading ${path.basename(dest)}: ${err.message}`);
      resolve();
    });
  });
}

async function run() {
  console.log('--- Downloading Custom Variable Font ---');
  await download(fontUrl, path.join(fontDir, 'adaptive.woff2'));

  console.log('--- Downloading SVG Logo ---');
  await download(logoUrl, path.join(r2Dir, 'Logo_286f9ecac6.svg'));

  console.log('--- Downloading Small Covers ---');
  for (const name of smallCovers) {
    const url = `https://k95.it/r2/${name}`;
    await download(url, path.join(r2Dir, name));
  }

  console.log('--- Downloading Large Covers ---');
  for (const name of largeCovers) {
    const url = `https://k95.it/r2/${name}`;
    await download(url, path.join(r2Dir, name));
  }

  console.log('--- Downloading MN Inner Showcase Assets ---');
  for (const name of mnInnerAssets) {
    const url = `https://k95.it/r2/${name}`;
    await download(url, path.join(r2Dir, name));
  }

  console.log('--- Download Complete! ---');
}

run();
