const fs = require('fs');
const path = require('path');
const js = fs.readFileSync(path.join(__dirname, 'k95_Du7_eDLQ.js'), 'utf-8');

const regex = /const im=|function im\(/;
const m = regex.exec(js);
if (m) {
  console.log(js.slice(m.index - 500, m.index + 3500));
} else {
  console.log('Searching for boot-loader counter animation...');
  const idx = js.indexOf('boot-loader__counter');
  console.log(js.slice(idx - 1500, idx + 1000));
}
