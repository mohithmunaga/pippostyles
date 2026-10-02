const fs = require('fs');
const path = require('path');
const js = fs.readFileSync(path.join(__dirname, 'k95_Du7_eDLQ.js'), 'utf-8');

// Find the boot-loader component code
const idx = js.indexOf('boot-loader');
console.log('--- BOOT LOADER DEFINITION ---');
console.log(js.slice(idx - 500, idx + 2000));

// Find the boot counter logic and progress increment
console.log('\n--- SEARCHING FOR COUNTER / PROGRESS ---');
const counterMatches = js.match(/.{0,100}(\[0\]|\[100\]|boot-loader__counter|boot-loader__stack).{0,300}/g);
if (counterMatches) {
  counterMatches.forEach((m, i) => console.log(`\n[Counter Match ${i + 1}]:\n${m}`));
}

// Find 3D scene initialization and entrance
console.log('\n--- 3D SCENE ENTER / REVEAL ---');
const sceneMatches = js.match(/.{0,100}(scene\.add|setWebGLLayout|renderTarget|buildCylinderPanels|perspectiveCamera|layout-switch).{0,300}/g);
if (sceneMatches) {
  sceneMatches.slice(0, 8).forEach((m, i) => console.log(`\n[Scene Match ${i + 1}]:\n${m}`));
}
