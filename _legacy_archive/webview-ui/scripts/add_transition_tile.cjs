const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'public/assets/default-layout-1.json');
const layout = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const cols = layout.cols;
const rows = layout.rows;

// TILE IDS
const WALL_WHITE = 150;
const WALL_TRANSITION = 151;
const WALL_BASE = 100;

/**
 * Update the top wall section to be a 3-tile system:
 * Row 0: White
 * Row 1: White
 * Row 2: Transition (Half-White/Half-Gray)
 * Row 3: Gray Base
 */
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < cols; c++) {
    const idx = r * cols + c;
    const currentTile = layout.tiles[idx];

    // Only update if it's currently a wall tile
    const isWall = currentTile === 0 || currentTile >= 100;
    if (!isWall) continue;

    if (r < 2) {
      layout.tiles[idx] = WALL_WHITE;
    } else if (r === 2) {
      layout.tiles[idx] = WALL_TRANSITION;
    } else {
      layout.tiles[idx] = WALL_BASE;
    }
  }
}

fs.writeFileSync(filePath, JSON.stringify(layout, null, 2));
console.log('✨ SUCCESS: Modular 3-tile wall system applied (White -> Transition -> Gray Base).');
