const fs = require('fs');
const path = 'webview-ui/public/assets/default-layout-1.json';
const layout = JSON.parse(fs.readFileSync(path, 'utf8'));

const cols = 22;
const rows = 14;

const tiles = new Array(cols * rows).fill(255); // Default to VOID
const tileColors = new Array(cols * rows).fill(null);

const DEFAULT_LEFT_ROOM_COLOR = { h: 35, s: 30, b: 15, c: 0 }; // warm beige
const DEFAULT_RIGHT_ROOM_COLOR = { h: 25, s: 45, b: 5, c: 10 }; // warm brown

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
  tiles[0 * cols + c] = 0; 
  tiles[(rows - 1) * cols + c] = 0; 
}
for (let r = 0; r < rows; r++) {
  tiles[r * cols + 0] = 0; 
  tiles[r * cols + (cols - 1)] = 0; 
}

// Middle Divider (at column 11 for 22 total cols)
for (let r = 1; r < rows - 1; r++) {
  tiles[r * cols + 11] = 0; 
}

layout.cols = cols;
layout.rows = rows;
layout.tiles = tiles;
layout.tileColors = tileColors;
layout.layoutRevision = (layout.layoutRevision || 6) + 1;

fs.writeFileSync(path, JSON.stringify(layout, null, 2));
console.log(`Office resized to ${cols}x${rows} (Revision: ${layout.layoutRevision})`);
