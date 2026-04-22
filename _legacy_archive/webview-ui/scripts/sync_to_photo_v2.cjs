const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'public/assets/default-layout-1.json');
const layout = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const cols = layout.cols;
const rows = layout.rows;

// 1. CLEAR EVERYTHING to Floor (1) except perimeter
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    layout.tiles[r * cols + c] = 1; 
  }
}

// 2. ADD WALLS
// Top Wall (Row 0)
for (let c = 0; c < cols; c++) layout.tiles[0 * cols + c] = 0;

// Side Walls (Col 0 and Col 22)
// STOP at Row 12 (don't go to 13)
for (let r = 0; r < 13; r++) {
  layout.tiles[r * cols + 0] = 0;
  layout.tiles[r * cols + 22] = 0;
}

// Divider Wall (Col 11)
// With a doorway at Row 6-7
for (let r = 0; r < 13; r++) {
  if (r < 5 || r > 8) {
    layout.tiles[r * cols + 11] = 0;
  }
}

// 3. COLORS (Ensure matching photo)
const woodColor = { h: 30, s: 40, b: 15, c: 0 };
const blueColor = { h: 210, s: 40, b: 25, c: 0 };
const wallColor = { h: 230, s: 15, b: -20, c: 0 };
const whiteColor = { h: 0, s: 0, b: 80, c: 0 };
const blackColor = { h: 0, s: 0, b: -80, c: 0 };

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const idx = r * cols + c;
    const tile = layout.tiles[idx];
    if (tile === 0) {
      layout.tileColors[idx] = wallColor;
    } else if (c < 11) {
      layout.tileColors[idx] = woodColor;
    } else {
      if (r >= 11) {
        const isWhite = (r + c) % 2 === 0;
        layout.tileColors[idx] = isWhite ? whiteColor : blackColor;
      } else {
        layout.tileColors[idx] = blueColor;
      }
    }
  }
}

fs.writeFileSync(filePath, JSON.stringify(layout, null, 2));
console.log('Layout fully synchronized: Divider restored, Bottom open.');
