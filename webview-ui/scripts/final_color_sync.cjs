const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'public/assets/default-layout-1.json');
const layout = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const cols = layout.cols;
const rows = layout.rows;

/**
 * THE FINAL COLOR PALETTE
 * Consistent, professional, and matched to the office aesthetic.
 */
const PALETTE = {
  WALL_GRAY:  { h: 230, s: 15, b: -20, c: 0 }, // Muted Blue-Gray
  WALL_WHITE: { h: 0,   s: 0,  b: 80,  c: 0 }, // Soft Off-White
  FLOOR_WOOD: { h: 30,  s: 40, b: 15,  c: 0 }, // Warm Oak
  FLOOR_SLATE:{ h: 220, s: 10, b: -10, c: 0 }, // Professional Slate Tile
  FLOOR_NAVY: { h: 210, s: 20, b: -30, c: 0 }  // Muted Navy Carpet
};

// Floor Types
const FLOOR_SOLID = 1;
const FLOOR_TILES = 2;
const FLOOR_WOOD  = 3;

// Apply palette to all tiles based on their location/type
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const idx = r * cols + c;
    const tile = layout.tiles[idx];

    // 1. Modular Wall Pieces
    if (tile >= 100) {
      if (r < 2) {
        layout.tileColors[idx] = PALETTE.WALL_WHITE;
      } else {
        layout.tileColors[idx] = PALETTE.WALL_GRAY;
      }
      continue;
    }

    // 2. Auto-Walls (Tile 0)
    if (tile === 0) {
      layout.tileColors[idx] = PALETTE.WALL_GRAY;
      continue;
    }

    // 3. Floor Areas
    if (c < 11) {
      // Left Room: Executive Wood
      layout.tiles[idx] = FLOOR_WOOD;
      layout.tileColors[idx] = PALETTE.FLOOR_WOOD;
    } else {
      // Right Room: Open Office
      if (r >= 11) {
        // Bottom Walkway: Professional Slate Tiles
        layout.tiles[idx] = FLOOR_TILES;
        layout.tileColors[idx] = PALETTE.FLOOR_SLATE;
      } else {
        // Main Area: Muted Navy Carpet
        layout.tiles[idx] = FLOOR_SOLID;
        layout.tileColors[idx] = PALETTE.FLOOR_NAVY;
      }
    }
  }
}

// 4. Update existing furniture to match
layout.furniture.forEach(f => {
  if (f.type === 'WHITEBOARD') f.color = PALETTE.WALL_WHITE;
  if (f.type === 'PAINTING') f.color = PALETTE.WALL_WHITE;
});

fs.writeFileSync(filePath, JSON.stringify(layout, null, 2));
console.log('✨ SUCCESS: Final professional color scheme applied to all wall and floor tiles.');
console.log('Palette Summary:');
console.table(PALETTE);
