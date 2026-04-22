/**
 * fix_layout_schema.cjs
 * 
 * The existing furniture entries in default-layout-1.json use wrong field names:
 *   - id   → should be uid
 *   - x    → should be col
 *   - y    → should be row
 * 
 * This script fixes the schema AND bumps the layoutRevision so the browser reloads.
 * 
 * Run from: webview-ui/ directory
 * Command:  node src/office/scratch/fix_layout_schema.cjs
 */

const fs = require('fs');
const path = require('path');

const LAYOUT_PATH = path.resolve(__dirname, '../../../public/assets/default-layout-1.json');

const layout = JSON.parse(fs.readFileSync(LAYOUT_PATH, 'utf-8'));

console.log(`\n🔍 Current layout: ${layout.cols}×${layout.rows}, revision ${layout.layoutRevision}`);
console.log(`   Furniture count: ${layout.furniture.length}`);
console.log('   Before fix:');
layout.furniture.forEach(f => console.log(`     ${JSON.stringify(f)}`));

// Fix field names: id→uid, x→col, y→row, remove 'state' (not in schema)
const fixed = layout.furniture.map(f => {
  const entry = {
    uid: f.uid || f.id,
    type: f.type,
    col: f.col !== undefined ? f.col : f.x,
    row: f.row !== undefined ? f.row : f.y,
  };
  // Keep color if present
  if (f.color) entry.color = f.color;
  return entry;
});

const newLayout = {
  ...layout,
  furniture: fixed,
  layoutRevision: (layout.layoutRevision || 0) + 1,
};

fs.writeFileSync(LAYOUT_PATH, JSON.stringify(newLayout, null, 2), 'utf-8');

console.log('\n   After fix:');
newLayout.furniture.forEach(f => console.log(`     ${JSON.stringify(f)}`));
console.log(`\n✅ Schema fixed. Revision bumped to ${newLayout.layoutRevision}`);
