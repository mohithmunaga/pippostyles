import fs from 'fs';

const lines = fs.readFileSync('./scripts/extracted_formatted.js', 'utf8').split('\n');

// Filter lines of interest
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('camera') || line.includes('fov') || line.includes('radius') || line.includes('rowSpacing') || line.includes('thetaRing') || line.includes('thetaSpiral') || line.includes('In(') || line.includes('In=') || line.includes('panelW') || line.includes('panelH') || line.includes('rosa.glb')) {
    console.log(`${i}: ${line.trim()}`);
  }
}
