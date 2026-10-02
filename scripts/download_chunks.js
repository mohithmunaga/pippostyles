import https from 'https';
import fs from 'fs';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  const html = fs.readFileSync('./scripts/prod_index.html', 'utf8');
  const allJs = [...new Set(html.match(/[\/a-zA-Z0-9_\.-]+\.js/g) || [])];
  
  for (const jsPath of allJs) {
    if (!jsPath.startsWith('/_nuxt/')) continue;
    const url = 'https://k95.it' + jsPath;
    console.log('Fetching', url);
    try {
      const code = await fetchUrl(url);
      const filename = jsPath.replace('/_nuxt/', '');
      fs.writeFileSync('./scripts/' + filename, code);
      console.log('Saved', filename, 'size:', code.length);
      
      // Check for 3D library mentions
      if (code.includes('three') || code.includes('THREE') || code.includes('WebGL') || code.includes('spline') || code.includes('Shader') || code.includes('Ring') || code.includes('Spiral')) {
        console.log('--> MATCH in', filename);
      }
    } catch(e) {
      console.error('Error fetching', url, e.message);
    }
  }
}

run();
