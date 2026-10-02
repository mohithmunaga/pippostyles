const fs = require('fs');
const path = require('path');

const js = fs.readFileSync(path.join(__dirname, 'k95_Du7_eDLQ.js'), 'utf-8');
const html = fs.readFileSync(path.join(__dirname, 'k95_home.html'), 'utf-8');
const css = fs.readFileSync(path.join(__dirname, 'k95_entry.BvMG1axO.css'), 'utf-8');

console.log('--- LOADER HTML / STRUCTURE ---');
const loaderHtml = html.match(/<div[^>]*class="[^"]*load[^"]*"[^>]*>[\s\S]*?<\/div>/gi);
console.log('Loader elements in HTML:', loaderHtml);

// Search for loader component and opening timelines in JS
console.log('\n--- LOADER / OPENING IN JS ---');
const loaderRegex = /class\s*:\s*["'][^"']*loader[^"']*["']|loader__stack|loader__count|loader__img|enterTimeline|introTimeline|openScene|reveal/gi;
const matches = [];
let match;
while ((match = loaderRegex.exec(js)) !== null) {
  const start = Math.max(0, match.index - 100);
  const end = Math.min(js.length, match.index + 250);
  matches.push(js.slice(start, end));
  if (matches.length > 8) break;
}
matches.forEach((m, i) => console.log(`\n[Match ${i + 1}]:\n${m}`));

// Search for GSAP animations or camera animations in JS
console.log('\n--- 3D SCENE / CAMERA ENTRANCE ---');
const cameraRegex = /camera\.position|timeline\(|gsap\.to\(|gsap\.from\(/gi;
const camMatches = [];
while ((match = cameraRegex.exec(js)) !== null) {
  const start = Math.max(0, match.index - 100);
  const end = Math.min(js.length, match.index + 200);
  camMatches.push(js.slice(start, end));
  if (camMatches.length > 8) break;
}
camMatches.forEach((m, i) => console.log(`\n[Cam Match ${i + 1}]:\n${m}`));
