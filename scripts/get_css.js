const https = require('https');
const fs = require('fs');

https.get('https://k95.it/en/works', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const cssLinks = data.match(/href="[^"]+\.css"/g);
    console.log('CSS links:', cssLinks);
    if (cssLinks) {
      cssLinks.forEach((link, i) => {
        const url = 'https://k95.it' + link.replace('href="', '').replace('"', '');
        https.get(url, res2 => {
          let cssData = '';
          res2.on('data', c2 => cssData += c2);
          res2.on('end', () => {
            fs.writeFileSync(`./scripts/k95_style_${i}.css`, cssData);
            console.log(`Saved ${url}, length:`, cssData.length);
          });
        });
      });
    }
  });
});
