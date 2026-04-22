const fs = require('fs');
const path = 'webview-ui/public/assets/default-layout-1.json';
const layout = JSON.parse(fs.readFileSync(path, 'utf8'));

// Border (1) + Left Room (10) + Divider (1) + Right Room (10) + Border (1) = 23
const cols = 23;
const rows = 14;

const tiles = new Array(cols * rows).fill(255); // VOID
const tileColors = new Array(cols * rows).fill(null);

const DEFAULT_LEFT_ROOM_COLOR = { h: 35, s: 30, b: 15, c: 0 }; 
const DEFAULT_RIGHT_ROOM_COLOR = { h: 25, s: 45, b: 5, c: 10 }; 
const WALL_CONTRAST_COLOR = { h: 220, s: 15, b: -40, c: 20 }; 

// Fill floors
for (let r = 1; r < rows - 1; r++) {
  for (let c = 1; c < cols - 1; c++) {
    const idx = r * cols + c;
    if (c < 11) {
      tiles[idx] = 1; // FLOOR_1
      tileColors[idx] = DEFAULT_LEFT_ROOM_COLOR;
    } else if (c > 11) {
      tiles[idx] = 2; // FLOOR_2
      tileColors[idx] = DEFAULT_RIGHT_ROOM_COLOR;
    } else {
        // This is the divider column (c=11)
        // Opening at r=6, 7, 8 for a 3-tile wide gap
        if (r === 6 || r === 7 || r === 8) {
            tiles[idx] = 1; // FLOOR_1 doorway
            tileColors[idx] = DEFAULT_LEFT_ROOM_COLOR;
        }
    }
  }
}

// Border Walls
for (let c = 0; c < cols; c++) {
  const topIdx = 0 * cols + c;
  const botIdx = (rows - 1) * cols + c;
  tiles[topIdx] = 0; tileColors[topIdx] = WALL_CONTRAST_COLOR;
  tiles[botIdx] = 0; tileColors[botIdx] = WALL_CONTRAST_COLOR;
}
for (let r = 0; r < rows; r++) {
  const leftIdx = r * cols + 0;
  const rightIdx = r * cols + (cols - 1);
  tiles[leftIdx] = 0; tileColors[leftIdx] = WALL_CONTRAST_COLOR;
  tiles[rightIdx] = 0; tileColors[rightIdx] = WALL_CONTRAST_COLOR;
}

// Middle Divider (with opening at r=6,7,8)
for (let r = 1; r < rows - 1; r++) {
  if (r === 6 || r === 7 || r === 8) continue; // Skip for door
  const midIdx = r * cols + 11;
  tiles[midIdx] = 0; 
  tileColors[midIdx] = WALL_CONTRAST_COLOR;
}

layout.cols = cols;
layout.rows = rows;
layout.tiles = tiles;
layout.tileColors = tileColors;
layout.furniture = []; 
layout.layoutRevision = (layout.layoutRevision || 12) + 1;

fs.writeFileSync(path, JSON.stringify(layout, null, 2));
console.log(`Rooms balanced (10 wide each) with a 3-TILE DOORWAY at rows 6-8. Total size: ${cols}x${rows}. Revision: ${layout.layoutRevision}`);
