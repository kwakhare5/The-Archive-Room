const fs = require('fs');
const path = 'webview-ui/public/assets/default-layout-1.json';
const layout = JSON.parse(fs.readFileSync(path, 'utf8'));

const furniture = [];

// --- ZONE 2: ARCHIVE MATRIX (Right Side) ---
// 4 rows of 5 bookshelves
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 5; c++) {
    const id = (r * 5 + c + 1).toString().padStart(3, '0');
    furniture.push({
      uid: `A-${id}`,
      type: "DOUBLE_BOOKSHELF",
      col: 13 + (c * 2), // 13, 15, 17, 19, 21
      row: 1 + (r * 3)   // 1, 4, 7, 10
    });
  }
}

// --- ZONE 1: EXECUTION PODS (Now Bottom Left/Center) ---
// Swapped to Zone 3's old position
for (let i = 0; i < 3; i++) {
  const col = 2 + (i * 4); // 2, 6, 10
  furniture.push({ uid: `z1_desk_${i+1}`, type: "DESK_FRONT", col: col, row: 9 });
  furniture.push({ uid: `z1_pc_${i+1}`, type: "PC_FRONT_ON_1", col: col, row: 9 });
  furniture.push({ uid: `z1_chair_${i+1}`, type: "CUSHIONED_CHAIR_FRONT", col: col + 1, row: 11 });
}

// --- ZONE 3: UTILITY DIVIDER (Now Top Left) ---
// Swapped to Zone 1's old position
furniture.push({ uid: "z3_whiteboard", type: "WHITEBOARD", col: 4, row: 1 });
furniture.push({ uid: "z3_sofa", type: "SOFA_FRONT", col: 2, row: 4 });
furniture.push({ uid: "z3_coffee_table", type: "COFFEE_TABLE", col: 5, row: 4 });
furniture.push({ uid: "z3_coffee_cup", type: "COFFEE", col: 5, row: 4 });
furniture.push({ uid: "z3_bin", type: "BIN", col: 1, row: 4 });

layout.furniture = furniture;

// Cleanup any remaining wall tiles from previous experiments
for (let i = 0; i < layout.tiles.length; i++) {
  // Reset all tiles to Floor 1, except the borders
  const r = Math.floor(i / 23);
  const c = i % 23;
  if (r === 0 || r === 13 || c === 0 || c === 22) {
    layout.tiles[i] = 0; // Wall
  } else {
    layout.tiles[i] = 1; // Floor
  }
}

fs.writeFileSync(path, JSON.stringify(layout, null, 2));
console.log('Office restored and Zones interchanged successfully');
