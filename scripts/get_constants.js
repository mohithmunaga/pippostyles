import fs from 'fs';

const lines = fs.readFileSync('./scripts/extracted_formatted.js', 'utf8').split('\n');
const chunk = lines.slice(0, 350).join('\n');
fs.writeFileSync('./scripts/cylinder_constants.js', chunk);
console.log('Saved cylinder_constants.js');
