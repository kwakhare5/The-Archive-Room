const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'public/assets/default-layout-1.json');
const layout = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const cols = layout.cols;
const rows = layout.rows;

// Exact Photo Palette
const officeColor = { h: 30, s: 40, b: 15, c: 0 }; // Wood Brown
const loungeColor = { h: 210, s: 40, b: 25, c: 0 }; // Lounge Blue
const wallColor = { h: 230, s: 15, b: -20, c: 0 };   // Dark Blue/Gray
const whiteColor = { h: 0, s: 0, b: 80, c: 0 };     // White
const blackColor = { h: 0, s: 0, b: -80, c: 0 };    // Black

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const idx = r * cols + c;
    const tile = layout.tiles[idx];
    if (tile === 0) {
      layout.tileColors[idx] = wallColor;
    } else if (c < 11) {
      layout.tileColors[idx] = officeColor;
    } else {
      if (r >= 11) {
        const isWhite = (r + c) % 2 === 0;
        layout.tileColors[idx] = isWhite ? whiteColor : blackColor;
      } else {
        layout.tileColors[idx] = loungeColor;
      }
    }
  }
}

fs.writeFileSync(filePath, JSON.stringify(layout, null, 2));
console.log('Layout synchronized: Wood Office, Blue Lounge, Checkered bottom.');
