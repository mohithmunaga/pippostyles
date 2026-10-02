const fs = require('fs');
const code = fs.readFileSync('./scripts/B0njMRvH.js', 'utf8');

// Let's beautify or split by component
function formatCode(str) {
  return str
    .replace(/;/g, ';\n')
    .replace(/\{/g, '{\n')
    .replace(/\}/g, '\n}\n');
}

fs.writeFileSync('./scripts/B0njMRvH_formatted.js', formatCode(code));
console.log('Saved B0njMRvH_formatted.js');
