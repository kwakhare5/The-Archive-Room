const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'public/assets/default-layout-1.json');
const layout = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const cols = layout.cols;
const rows = layout.rows;

// Remove bottom wall (Row 13)
for (let c = 0; c < cols; c++) {
  const idx = (rows - 1) * cols + c;
  layout.tiles[idx] = 1; // Set to floor
}

fs.writeFileSync(filePath, JSON.stringify(layout, null, 2));
console.log('Bottom horizontal wall completely removed.');
