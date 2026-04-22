const fs = require('fs');
const path = 'webview-ui/public/assets/default-layout-1.json';
const layout = JSON.parse(fs.readFileSync(path, 'utf8'));

const cols = 32;
const rows = 33;

const tiles = new Array(cols * rows).fill(255); // Default to VOID
const tileColors = new Array(cols * rows).fill(null);

const DEFAULT_LEFT_ROOM_COLOR = { h: 35, s: 30, b: 15, c: 0 }; // warm beige
const DEFAULT_RIGHT_ROOM_COLOR = { h: 25, s: 45, b: 5, c: 10 }; // warm brown

// Create a large room structure
// 1. Fill a large area with floors
for (let r = 1; r < rows - 1; r++) {
  for (let c = 1; c < cols - 1; c++) {
    const idx = r * cols + c;
    if (c < 16) {
      tiles[idx] = 1; // FLOOR_1
      tileColors[idx] = DEFAULT_LEFT_ROOM_COLOR;
    } else {
      tiles[idx] = 2; // FLOOR_2
      tileColors[idx] = DEFAULT_RIGHT_ROOM_COLOR;
    }
  }
}

// 2. Add outer walls
for (let c = 0; c < cols; c++) {
  tiles[0 * cols + c] = 0; // Top wall
  tiles[(rows - 1) * cols + c] = 0; // Bottom wall
}
for (let r = 0; r < rows; r++) {
  tiles[r * cols + 0] = 0; // Left wall
  tiles[r * cols + (cols - 1)] = 0; // Right wall
}

// 3. Add a dividing wall partway
for (let r = 1; r < rows - 1; r++) {
  tiles[r * cols + 16] = 0; // Divider
}

layout.cols = cols;
layout.rows = rows;
layout.tiles = tiles;
layout.tileColors = tileColors;
layout.layoutRevision = (layout.layoutRevision || 2) + 1;

fs.writeFileSync(path, JSON.stringify(layout, null, 2));
console.log(`Room restored to ${cols}x${rows} with floors and walls. (Revision: ${layout.layoutRevision})`);
