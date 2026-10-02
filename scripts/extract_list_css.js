const fs = require('fs');
const chunk = fs.readFileSync('./scripts/found_works_list_chunk.txt', 'utf8');

// Find all CSS strings or style rules
const cssRegex = /"([^"]*works-list[^"]*)"/g;
let m;
while ((m = cssRegex.exec(chunk)) !== null) {
  console.log('--- FOUND CSS STRING (len: ' + m[1].length + ') ---');
  fs.writeFileSync('./scripts/extracted_works_list.css', m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'));
  console.log(m[1].substring(0, 500));
}
