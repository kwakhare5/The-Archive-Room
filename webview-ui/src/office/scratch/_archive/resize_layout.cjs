const fs = require('fs');
const path = 'webview-ui/public/assets/default-layout-1.json';
const layout = JSON.parse(fs.readFileSync(path, 'utf8'));

// We want to scale relative to the ORIGINAL size (21x22)
// to ensure a clean 1.5x result.
const baseCols = 21;
const baseRows = 22;
const newCols = Math.round(baseCols * 1.5); // 32
const newRows = Math.round(baseRows * 1.5); // 33

const newTiles = new Array(newCols * newRows).fill(255);
const newTileColors = new Array(newCols * newRows).fill(null);

// Note: If you want to keep the furniture, we keep it as is, 
// the user said they would handle it.

layout.cols = newCols;
layout.rows = newRows;
layout.tiles = newTiles;
layout.tileColors = newTileColors;
layout.layoutRevision = (layout.layoutRevision || 1) + 1;

fs.writeFileSync(path, JSON.stringify(layout, null, 2));
console.log(`Resized to ${newCols}x${newRows} (Revision: ${layout.layoutRevision})`);
