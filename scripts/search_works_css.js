const fs = require('fs');
const css = fs.readFileSync('./scripts/k95_style_1.css', 'utf8');

let idx = 0;
while ((idx = css.indexOf('.works', idx)) !== -1) {
  const start = Math.max(0, idx - 50);
  const end = Math.min(css.length, idx + 200);
  console.log('--- MATCH AT', idx, '---');
  console.log(css.substring(start, end));
  idx += 6;
}
