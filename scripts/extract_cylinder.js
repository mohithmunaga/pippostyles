import fs from 'fs';

const code = fs.readFileSync('./scripts/CX9Kzh5a.js', 'utf8');

// Write out formatted chunks or look for ThreeCylinderScene
fs.writeFileSync('./scripts/ThreeCylinderScene_raw.js', code);
console.log('Saved raw code.');

// Find all constants and functions
const startIdx = code.indexOf('ThreeCylinderScene');
console.log('ThreeCylinderScene start index:', startIdx);

// Let's print out the shader code
const shaders = code.match(/uniform\s+\w+\s+\w+[\s\S]*?(?=`)/g) || [];
shaders.forEach((sh, i) => {
  console.log(`\n=== SHADER ${i+1} ===\n`, sh);
});
