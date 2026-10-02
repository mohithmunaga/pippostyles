const https = require('https');
const fs = require('fs');

const cssList = [
  'CFOXKyc2.css', 'D52qgMC5.css',
  'Dzk9rmFA.css', 'BtE8Xhik.css',
  'Cf-gMcs2.css', 'CWuziPPI.css',
  'BRwbNNBg.css', 'Bcfzq7Jf.css',
  'D7pSIbjM.css', 'DGSFcwWc.css',
  'DuJ5CnlB.css', 'DS_J1VVW.css',
  'CvHVgMGG.css', 'D57lDFl7.css',
  'BNHonqq2.css'
];

cssList.forEach(name => {
  const url = `https://k95.it/_nuxt/${name}`;
  https.get(url, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      if (d.includes('works-list')) {
        console.log('*** FOUND WORKS-LIST IN:', name, 'Length:', d.length);
        fs.writeFileSync(`./scripts/k95_works_list_${name}`, d);
      }
    });
  });
});
