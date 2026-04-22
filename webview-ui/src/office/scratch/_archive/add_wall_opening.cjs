const fs = require('fs');
const path = 'webview-ui/public/assets/default-layout-1.json';
const layout = JSON.parse(fs.readFileSync(path, 'utf8'));

const cols = 22;
const rows = 14;

const tiles = new Array(cols * rows).fill(255); // Default to VOID
const tileColors = new Array(cols * rows).fill(null);

const DEFAULT_LEFT_ROOM_COLOR = { h: 35, s: 30, b: 15, c: 0 }; // warm beige
const DEFAULT_RIGHT_ROOM_COLOR = { h: 25, s: 45, b: 5, c: 10 }; // warm brown
const WALL_CONTRAST_COLOR = { h: 220, s: 15, b: -40, c: 20 }; // Dark Slate Blue-Gray

// Create the room structure
for (let r = 1; r < rows - 1; r++) {
  for (let c = 1; c < cols - 1; c++) {
    const idx = r * cols + c;
    if (c < 11) {
      tiles[idx] = 1; // FLOOR_1
      tileColors[idx] = DEFAULT_LEFT_ROOM_COLOR;
    } else {
      tiles[idx] = 2; // FLOOR_2
      tileColors[idx] = DEFAULT_RIGHT_ROOM_COLOR;
    }
  }
}

// Border Walls
for (let c = 0; c < cols; c++) {
  const topIdx = 0 * cols + c;
  const botIdx = (rows - 1) * cols + c;
  tiles[topIdx] = 0; 
  tileColors[topIdx] = WALL_CONTRAST_COLOR;
  tiles[botIdx] = 0;
  tileColors[botIdx] = WALL_CONTRAST_COLOR;
}
for (let r = 0; r < rows; r++) {
  const leftIdx = r * cols + 0;
  const rightIdx = r * cols + (cols - 1);
  tiles[leftIdx] = 0; 
  tileColors[leftIdx] = WALL_CONTRAST_COLOR;
  tiles[rightIdx] = 0; 
  tileColors[rightIdx] = WALL_CONTRAST_COLOR;
}

// Middle Divider with an Opening (at r=6 and r=7)
const openingStart = 6;
const openingEnd = 7;

for (let r = 1; r < rows - 1; r++) {
  const midIdx = r * cols + 11;
  
  if (r >= openingStart && r <= openingEnd) {
    // This is the opening — set to Floor 1 by default
    tiles[midIdx] = 1; 
    tileColors[midIdx] = DEFAULT_LEFT_ROOM_COLOR;
  } else {
    // Normal wall
    tiles[midIdx] = 0; 
    tileColors[midIdx] = WALL_CONTRAST_COLOR;
  }
}

layout.cols = cols;
layout.rows = rows;
layout.tiles = tiles;
layout.tileColors = tileColors;
layout.layoutRevision = (layout.layoutRevision || 9) + 1;

fs.writeFileSync(path, JSON.stringify(layout, null, 2));
console.log(`Office updated with Wall Opening (Revision: ${layout.layoutRevision})`);
