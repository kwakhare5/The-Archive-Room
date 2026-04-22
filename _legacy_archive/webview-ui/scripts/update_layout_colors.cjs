const fs = require('fs');
const path = require('path');

// Fixed path: we are already in the webview-ui directory when running the command
const filePath = path.join(process.cwd(), 'public/assets/default-layout-1.json');
const layout = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const cols = layout.cols;
const rows = layout.rows;

// Colors from photo
const woodColor = { h: 30, s: 40, b: 20, c: 0 };
const blueColor = { h: 210, s: 30, b: 30, c: 0 };
const wallColor = { h: 220, s: 20, b: -10, c: 0 };

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const idx = r * cols + c;
    const tile = layout.tiles[idx];

    if (tile === 0) {
      // Wall
      layout.tileColors[idx] = wallColor;
    } else if (c < 12) {
      // Zone 1 (Left) - Now Lounge -> Blue
      layout.tileColors[idx] = blueColor;
    } else {
      // Zone 3 (Right) - Now Office -> Wood
      layout.tileColors[idx] = woodColor;
    }
  }
}

fs.writeFileSync(filePath, JSON.stringify(layout, null, 2));
console.log('Layout colors updated successfully.');
