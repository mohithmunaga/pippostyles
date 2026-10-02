import fs from 'fs';

const lines = fs.readFileSync('./scripts/extracted_formatted.js', 'utf8').split('\n');
const chunk = lines.slice(340, 850).join('\n');
fs.writeFileSync('./scripts/cylinder_exact.js', chunk);
console.log('Saved cylinder_exact.js, lines:', lines.length);
