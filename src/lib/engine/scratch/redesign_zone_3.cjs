/**
 * redesign_zone_3.cjs
 * 
 * Redesigns Zone 3 (bottom-left of the left room) per CLAUDE.md spec:
 *   - Whiteboard  (col 9, row 8, 2×2) → Reasoning / CoT
 *   - SOFA_FRONT  (col 2, row 10, 2×1) → Lounge / Idle
 *   - COFFEE      (col 1, row 8, 1×1) → Rate-limit / Idle
 *   - BIN         (col 1, row 11, 1×1) → Context Trim
 * 
 * Run from: webview-ui/
 * Command:  node src/office/scratch/redesign_zone_3.cjs
 */

const fs = require('fs');
const path = require('path');

const LAYOUT_PATH = path.resolve(__dirname, '../../../public/assets/default-layout-1.json');
const layout = JSON.parse(fs.readFileSync(LAYOUT_PATH, 'utf-8'));

// Strip all previous Zone 3 furniture (any uid containing 'zone_3')
const base = layout.furniture.filter(f => !f.uid.includes('zone_3') && !f.uid.includes('zone3'));

// Zone 3 furniture — schema: uid, type, col, row
const zone3 = [
  // ── Reasoning corner (right side of zone 3, near divider wall) ─────────
  {
    uid: 'z3_whiteboard',
    type: 'WHITEBOARD',
    col: 9,
    row: 8,
    // 2×2 footprint — occupies cols 9-10, rows 8-9
  },

  // ── Lounge / Idle cluster (center-left) ────────────────────────────────
  {
    uid: 'z3_sofa',
    type: 'SOFA_FRONT',
    col: 2,
    row: 10,
    // 2×1 footprint — occupies cols 2-3, row 10
  },
  {
    uid: 'z3_coffee',
    type: 'COFFEE',
    col: 1,
    row: 8,
    // 1×1 footprint — against west wall
  },

  // ── Utility / Context Trim corner (bottom-left) ─────────────────────────
  {
    uid: 'z3_bin',
    type: 'BIN',
    col: 1,
    row: 11,
    // 1×1 footprint
  },
];

const newLayout = {
  ...layout,
  furniture: [...base, ...zone3],
  layoutRevision: (layout.layoutRevision || 0) + 1,
};

fs.writeFileSync(LAYOUT_PATH, JSON.stringify(newLayout, null, 2), 'utf-8');

console.log('\n✅ Zone 3 redesigned successfully!');
console.log(`   Layout: ${newLayout.cols}×${newLayout.rows} | Revision: ${newLayout.layoutRevision}`);
console.log(`   Total furniture: ${newLayout.furniture.length} items`);
console.log('\n   Zone 3 items placed:');
zone3.forEach(f => console.log(`     [${f.type}] uid:${f.uid} → col:${f.col} row:${f.row}`));
