import fs from 'fs';

const code = fs.readFileSync('./scripts/CX9Kzh5a.js', 'utf8');

// Let's search for functions, math formulas, materials, scene setup in CX9Kzh5a.js
console.log('File size:', code.length);

// Find occurrences of "rosa.glb" and surrounding code
const idx = code.indexOf('rosa.glb');
if (idx !== -1) {
  console.log('--- AROUND rosa.glb ---');
  console.log(code.substring(Math.max(0, idx - 500), Math.min(code.length, idx + 1500)));
}

// Find ring / spiral or position calculation
const keywords = ['position.set', 'rotation.set', 'ring', 'spiral', 'Math.cos', 'Math.sin', 'ShaderMaterial', 'MeshPhysicalMaterial', 'GLTFLoader'];

for (const kw of keywords) {
  let pos = 0;
  let count = 0;
  console.log(`\n=== Keyword: ${kw} ===`);
  while ((pos = code.indexOf(kw, pos)) !== -1 && count < 3) {
    console.log(code.substring(Math.max(0, pos - 100), Math.min(code.length, pos + 250)));
    console.log('------------------');
    pos += kw.length;
    count++;
  }
}
