const fs = require('fs');
const path = 'webview-ui/public/assets/default-layout-1.json';
const layout = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Remove all furniture (I'll rebuild it for Zone 1 and 3)
// We keep Zone 2 (Archives) which are A-001 through A-020
// Wait, I don't see Zone 2 in the furniture list I saw earlier...
// Let's check Zone 2.
const zone2 = layout.furniture.filter(f => f.uid.startsWith('A-'));

// 2. Define Zone 3 (Now Top Left)
const zone3 = [
  { uid: "z3_whiteboard", type: "WHITEBOARD", col: 4, row: 1 },
  { uid: "z3_sofa", type: "SOFA_FRONT", col: 2, row: 3 },
  { uid: "z3_coffee_table", type: "COFFEE_TABLE", col: 5, row: 3 },
  { uid: "z3_coffee_cup", type: "COFFEE", col: 5, row: 3 },
  { uid: "z3_bin", type: "BIN", col: 1, row: 3 }
];

// 3. Define Zone 1 (Now Bottom Left/Center)
const zone1 = [
  // Desk 1
  { uid: "z1_desk_1", type: "DESK_FRONT", col: 3, row: 9 },
  { uid: "z1_pc_1", type: "PC_FRONT_ON_1", col: 3, row: 9 },
  { uid: "z1_chair_1", type: "CUSHIONED_CHAIR_FRONT", col: 4, row: 11 },
  // Desk 2
  { uid: "z1_desk_2", type: "DESK_FRONT", col: 7, row: 9 },
  { uid: "z1_pc_2", type: "PC_FRONT_ON_1", col: 7, row: 9 },
  { uid: "z1_chair_2", type: "CUSHIONED_CHAIR_FRONT", col: 8, row: 11 },
  // Desk 3
  { uid: "z1_desk_3", type: "DESK_FRONT", col: 11, row: 9 },
  { uid: "z1_pc_3", type: "PC_FRONT_ON_1", col: 11, row: 9 },
  { uid: "z1_chair_3", type: "CUSHIONED_CHAIR_FRONT", col: 12, row: 11 }
];

layout.furniture = [...zone2, ...zone1, ...zone3];

// 4. Cleanup Tiles (Remove the pillar I added)
layout.tiles[8 * 23 + 11] = 1;
layout.tiles[9 * 23 + 11] = 1;
layout.tiles[10 * 23 + 11] = 1;

fs.writeFileSync(path, JSON.stringify(layout, null, 2));
console.log('Zones interchanged successfully');
