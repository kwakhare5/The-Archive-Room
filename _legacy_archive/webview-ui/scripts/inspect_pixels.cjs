const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const imgPath = path.join(__dirname, '../webview-ui/public/assets/walls/wall_0.png');
const data = fs.readFileSync(imgPath);
const png = PNG.sync.read(data);

// Check Tile 0 (Top left corner of the 64x128 image)
// It's 16x32.
// The top part (face) and bottom part (base).
console.log('Tile 0 (16x32):');
for (let y = 0; y < 32; y += 4) {
  let row = '';
  for (let x = 0; x < 16; x += 4) {
    const idx = (y * png.width + x) * 4;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    row += `[${r},${g},${b}] `;
  }
  console.log(`y=${y}: ${row}`);
}
