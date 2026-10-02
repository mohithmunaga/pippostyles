const https = require('https');
const fs = require('fs');

https.get('https://k95.it/en/works', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    const regex = /href="([^"]+)"/g;
    let match;
    const links = [];
    while ((match = regex.exec(d)) !== null) {
      links.push(match[1]);
    }
    console.log('All links:', links.filter(l => l.includes('.css') || l.includes('.js')));

    // Let's check each JS chunk to see which one contains works-list styles or injects them
    links.filter(l => l.includes('/_nuxt/') && (l.includes('.css') || l.includes('.js'))).forEach(l => {
      const url = 'https://k95.it' + l;
      https.get(url, res => {
        let chunk = '';
        res.on('data', c => chunk += c);
        res.on('end', () => {
          if (chunk.includes('works-list__char') || chunk.includes('works-list__item') || chunk.includes('data-v-96def13c')) {
            console.log('FOUND MATCH IN:', url);
            fs.writeFileSync('./scripts/found_works_list_chunk.txt', chunk);
          }
        });
      });
    });
  });
});
