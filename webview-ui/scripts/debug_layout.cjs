const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'public/assets/default-layout-1.json');
const layout = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const cols = layout.cols;
const rows = layout.rows;

console.log(`Grid: ${cols}x${rows}`);

// Print the grid (simplified)
for (let r = 0; r < rows; r++) {
  let rowStr = '';
  for (let c = 0; c < cols; c++) {
    rowStr += layout.tiles[r * cols + c];
  }
  console.log(`Row ${r.toString().padStart(2, ' ')}: ${rowStr}`);
}

// REMOVE THE BOTTOM WALL
// The bottom wall is usually the last row (rows-1)
// If there's a wall on row-2, we might need to remove that too if it's the "inner" bottom wall.

for (let c = 0; c < cols; c++) {
  // Clear last row
  layout.tiles[(rows - 1) * cols + c] = 1;
  // Clear penultimate row if it's mostly walls (the "bottom horizontal wall")
  // In many layouts, the actual wall is at rows-2 and rows-1 is the base.
  layout.tiles[(rows - 2) * cols + c] = 1;
}

fs.writeFileSync(filePath, JSON.stringify(layout, null, 2));
console.log('Bottom horizontal walls removed from Rows 12 and 13.');
