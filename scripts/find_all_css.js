const https = require('https');
const fs = require('fs');

// Fetch manifest or entry chunk to find the css file for WorksListView
https.get('https://k95.it/_nuxt/manifest.json', res => {
  if (res.statusCode === 200) {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Manifest found!');
      fs.writeFileSync('./scripts/manifest.json', d);
    });
  } else {
    // Let's check entry.BvMG1axO.js or similar
    https.get('https://k95.it/en/works', r => {
      let pageHtml = '';
      r.on('data', c => pageHtml += c);
      r.on('end', () => {
        const scripts = pageHtml.match(/src="[^"]+\.js"/g) || [];
        console.log('Scripts:', scripts);
        scripts.forEach(s => {
          const url = 'https://k95.it' + s.replace('src="', '').replace('"', '');
          https.get(url, r2 => {
            let js = '';
            r2.on('data', c => js += c);
            r2.on('end', () => {
              const cssInJs = js.match(/[a-zA-Z0-9_\-]+\.css/g) || [];
              if (cssInJs.length > 0) {
                console.log(url, 'references CSS:', cssInJs);
              }
            });
          });
        });
      });
    });
  }
});
