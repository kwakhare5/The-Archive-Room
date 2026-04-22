const fs = require('fs');
const path = require('path');

const LAYOUT_PATH = path.resolve(__dirname, '../../../public/assets/default-layout-1.json');
const layout = JSON.parse(fs.readFileSync(LAYOUT_PATH, 'utf-8'));

const cols = layout.cols;
const rows = layout.rows;

// Divider wall is at col 11.
// Let's print rows 4 through 10 at col 11
for (let r = 4; r <= 10; r++) {
  console.log(`Row ${r}, Col 11: ${layout.tiles[r * cols + 11]}`);
}

// Make the doorway 3 tiles wide. Let's make rows 6, 7, 8 into floor (1).
// Assuming left room has floor type 1 (or whatever is at 6,10) and right has something else.
const leftFloorType = layout.tiles[7 * cols + 10]; // Get floor type from left room

for (let r = 6; r <= 8; r++) {
  layout.tiles[r * cols + 11] = leftFloorType; // Set to floor
  layout.tileColors[r * cols + 11] = layout.tileColors[r * cols + 10]; // Copy color
}

layout.layoutRevision = (layout.layoutRevision || 0) + 1;

fs.writeFileSync(LAYOUT_PATH, JSON.stringify(layout, null, 2), 'utf-8');
console.log('\n✅ Doorway expanded to 3 tiles (rows 6, 7, 8).');
