const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'cards.json');
let text = fs.readFileSync(filePath, 'utf8');
const count1 = (text.match(/"note":\s*"Direct from heart"/g) || []).length;
const count2 = (text.match(/"note":\s*"just another moment\."/g) || []).length;
console.log('Direct from heart:', count1);
console.log('just another moment:', count2);

if (count1 > 0) {
  text = text.replace(/"note":\s*"Direct from heart"/g, '"note": "just another moment."');
  fs.writeFileSync(filePath, text, 'utf8');
  console.log('Replaced', count1, 'occurrences with just another moment.');
}
