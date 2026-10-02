import fs from 'fs';

const code = fs.readFileSync('./scripts/CX9Kzh5a.js', 'utf8');

// Let's find all functions and formulas in CX9Kzh5a.js
fs.writeFileSync('./scripts/extracted_formatted.js', code.replace(/;/g, ';\n').replace(/\{/g, '{\n').replace(/\}/g, '\n}\n'));

console.log('Formatted code written.');
