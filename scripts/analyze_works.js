const fs = require('fs');
const code = fs.readFileSync('./scripts/B0njMRvH.js', 'utf8');
console.log('Length:', code.length);
const matches = code.match(/__name:\s*\"[^\"]+\"/g);
console.log('Components:', matches);

// Check what imports or classes are present
const imports = code.match(/import\s*\{[^}]+\}\s*from\s*\"[^\"]+\"/g);
console.log('Imports:', imports);

// Check for scene / webgl / canvas
const hasCanvas = code.includes('canvas') || code.includes('works-canvas');
console.log('Has canvas:', hasCanvas);
