const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'public/assets/default-layout-1.json');
const layout = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const cols = layout.cols;
const rows = layout.rows;

// Data Nexus Blue/Teal Palette
const officeColor = { h: 200, s: 50, b: -30, c: 0 }; // Dark Teal
const loungeColor = { h: 190, s: 30, b: -10, c: 0 }; // Light Teal
const wallColor = { h: 220, s: 20, b: -40, c: 0 };   // Deep Slate
const whiteColor = { h: 190, s: 10, b: 80, c: 0 };   // Light Blue-ish White
const blackColor = { h: 220, s: 30, b: -60, c: 0 };  // Deep Blue-ish Black

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const idx = r * cols + c;
    const tile = layout.tiles[idx];

    if (tile === 0) {
      layout.tileColors[idx] = wallColor;
    } else if (c < 12) {
      // Left (Office) -> Dark Teal
      layout.tileColors[idx] = officeColor;
    } else {
      // Right (Lounge)
      if (r >= 11) {
        // Bottom checkered section (Blue/Black variant)
        const isWhite = (r + c) % 2 === 0;
        layout.tileColors[idx] = isWhite ? whiteColor : blackColor;
      } else {
        layout.tileColors[idx] = loungeColor;
      }
    }
  }
}

// FURNITURE RE-ARRANGEMENT (Same as previous, just syncing colors)
layout.furniture = [
  // OFFICE (Left)
  { "uid": "o_desk_1", "type": "DESK_FRONT", "col": 2, "row": 3 },
  { "uid": "o_pc_1", "type": "PC_FRONT_ON_1", "col": 2, "row": 3 },
  { "uid": "o_chair_1", "type": "WOODEN_CHAIR_FRONT", "col": 2, "row": 5 },
  
  { "uid": "o_desk_2", "type": "DESK_FRONT", "col": 7, "row": 3 },
  { "uid": "o_pc_2", "type": "PC_FRONT_ON_2", "col": 7, "row": 3 },
  { "uid": "o_chair_2", "type": "WOODEN_CHAIR_FRONT", "col": 7, "row": 5 },

  // Bottom desk cluster (4 desks)
  { "uid": "o_desk_3", "type": "DESK_FRONT", "col": 3, "row": 9 },
  { "uid": "o_pc_3", "type": "PC_FRONT_ON_3", "col": 3, "row": 9 },
  { "uid": "o_desk_4", "type": "DESK_FRONT", "col": 6, "row": 9 },
  { "uid": "o_pc_4", "type": "PC_FRONT_ON_1", "col": 6, "row": 9 },
  
  // Back Wall Decor
  { "uid": "o_shelf_1", "type": "BOOKSHELF", "col": 2, "row": 0 },
  { "uid": "o_clock", "type": "CLOCK", "col": 5, "row": 0 },
  { "uid": "o_shelf_2", "type": "BOOKSHELF", "col": 8, "row": 0 },
  { "uid": "o_plant_1", "type": "PLANT", "col": 1, "row": 0 },
  { "uid": "o_plant_2", "type": "PLANT", "col": 10, "row": 0 },

  // LOUNGE (Right)
  { "uid": "l_sofa_top", "type": "SOFA_FRONT", "col": 16, "row": 4 },
  { "uid": "l_sofa_bottom", "type": "SOFA_BACK", "col": 16, "row": 7 },
  { "uid": "l_sofa_left", "type": "SOFA_SIDE", "col": 15, "row": 5 },
  { "uid": "l_sofa_right", "type": "SOFA_SIDE", "col": 19, "row": 5, "mirrored": true },
  { "uid": "l_table", "type": "COFFEE_TABLE", "col": 16, "row": 5 },
  
  { "uid": "l_plant_1", "type": "LARGE_PLANT", "col": 13, "row": 1 },
  { "uid": "l_plant_2", "type": "LARGE_PLANT", "col": 21, "row": 1 },
  { "uid": "l_painting_1", "type": "SMALL_PAINTING", "col": 15, "row": 0 },
  { "uid": "l_painting_2", "type": "LARGE_PAINTING", "col": 17, "row": 0 },
  { "uid": "l_painting_3", "type": "SMALL_PAINTING", "col": 20, "row": 0 }
];

fs.writeFileSync(filePath, JSON.stringify(layout, null, 2));
console.log('Layout synchronized with Data Nexus colors and photo arrangement.');
