const https = require('https');

https.get('https://k95.it/en/studio', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const scripts = [...data.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)].map(m => m[1]);
    const jsTags = [...data.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
    console.log('Modulepreloads:', scripts);
    console.log('Scripts:', jsTags);

    const all = [...scripts, ...jsTags];
    all.forEach(s => {
      const u = s.startsWith('http') ? s : 'https://k95.it' + s;
      https.get(u, r => {
        let b = '';
        r.on('data', c => b += c);
        r.on('end', () => {
          const m = b.match(/[\w\-\.\/]+\.glb/g);
          if (m) {
            console.log('GLB found in', u, m);
          }
          const m2 = b.match(/\/3d\/[^\s"',]+/g);
          if (m2) {
            console.log('/3d/ found in', u, m2);
          }
        });
      });
    });
  });
});
