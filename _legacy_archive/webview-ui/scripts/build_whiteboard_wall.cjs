const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'public/assets/default-layout-1.json');
const layout = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const cols = layout.cols;
const rows = layout.rows;

// Tile Types from webview-ui/src/office/types.ts
const TILE_FLOOR = 1;
const WALL_AUTO = 0;
const WALL_BOTTOM = 100;
const WALL_FLAT = 150;

// Colors
const grayWallColor = { h: 230, s: 15, b: -20, c: 0 };
const offWhiteColor = { h: 0, s: 0, b: 80, c: 0 };

// 1. Build a 3-tile high wall at the top
for (let c = 0; c < cols; c++) {
  // Row 0: Flat Off-White (The top "Highlight" row)
  layout.tiles[0 * cols + c] = WALL_FLAT;
  layout.tileColors[0 * cols + c] = offWhiteColor;

  // Row 1: Flat Off-White (The middle row where whiteboard hangs)
  layout.tiles[1 * cols + c] = WALL_FLAT;
  layout.tileColors[1 * cols + c] = offWhiteColor;

  // Row 2: Bottom Piece (The base - Gray)
  layout.tiles[2 * cols + c] = WALL_BOTTOM;
  layout.tileColors[2 * cols + c] = grayWallColor;
}

// 2. Clear furniture on this wall
layout.furniture = layout.furniture.filter(f => f.row > 2);

// 3. Place Whiteboard on the wall
// Whiteboard is 2x2. We place it on Row 1 and 2.
// This leaves Row 0 (the top-most wall row) completely empty for that "space"
layout.furniture.push({
  uid: 'whiteboard-' + Date.now(),
  type: 'WHITEBOARD',
  col: 10, // Centerish
  row: 1,  // Starts on row 1, occupies row 1 and 2
  color: offWhiteColor
});

fs.writeFileSync(filePath, JSON.stringify(layout, null, 2));
console.log('✅ Wall built: 3-tiles high with Whiteboard at (Row 1, Col 10). Space on top is preserved!');
