const fs = require('fs');

const COLS = 20;
const ROWS = 12;

// Tile IDs from types.ts
const WALL_PANEL_WHITE = 160;
const WALL_PANEL_GRAY = 162;
const WALL_BORDER_BOTTOM_GRAY = 171;
const WALL_BORDER_SIDES_GRAY = 173;
const WALL_BORDER_LEFT_GRAY = 182;
const WALL_BORDER_RIGHT_GRAY = 183;

const FLOOR_WOOD = 2;
const FLOOR_BLUE = 3;

const tiles = new Array(COLS * ROWS).fill(0);
const tileColors = new Array(COLS * ROWS).fill(null);

// Colors for Floors
const WOOD_COLOR = { h: 35, s: 40, b: 15, c: 0 };
const BLUE_COLOR = { h: 220, s: 30, b: -10, c: 0 };
const GRAY_COLOR = { h: 230, s: 15, b: -20, c: 0 };
const WHITE_COLOR = { h: 0, s: 0, b: 80, c: 0 };

for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const idx = r * COLS + c;

    // Top Row: White Panelled Walls
    if (r === 0) {
      tiles[idx] = WALL_PANEL_WHITE;
      tileColors[idx] = WHITE_COLOR;
    } 
    // Bottom Row: Gray Bordered Walls
    else if (r === ROWS - 1) {
      tiles[idx] = WALL_BORDER_BOTTOM_GRAY;
      tileColors[idx] = GRAY_COLOR;
    }
    // Left Edge
    else if (c === 0) {
      tiles[idx] = WALL_BORDER_LEFT_GRAY;
      tileColors[idx] = GRAY_COLOR;
    }
    // Right Edge
    else if (c === COLS - 1) {
      tiles[idx] = WALL_BORDER_RIGHT_GRAY;
      tileColors[idx] = GRAY_COLOR;
    }
    // Middle Wall
    else if (c === 10) {
      if (r < 3 || r > 7) {
        tiles[idx] = WALL_BORDER_SIDES_GRAY;
        tileColors[idx] = GRAY_COLOR;
      } else {
        // Opening
        tiles[idx] = r > 5 ? FLOOR_BLUE : FLOOR_WOOD;
        tileColors[idx] = r > 5 ? BLUE_COLOR : WOOD_COLOR;
      }
    }
    // Floors
    else if (c < 10) {
      tiles[idx] = FLOOR_WOOD;
      tileColors[idx] = WOOD_COLOR;
    } else {
      tiles[idx] = FLOOR_BLUE;
      tileColors[idx] = BLUE_COLOR;
    }
  }
}

// Furniture
const furniture = [];

function add_furn(uid, ftype, col, row, options = {}) {
  const item = { uid, type: ftype, col, row };
  if (options.color) item.color = options.color;
  if (options.mirrored) item.mirrored = true;
  furniture.push(item);
}

// Left Room: Focus Area
add_furn('bookshelf_1', 'BOOKSHELF', 2, 0);
add_furn('bookshelf_2', 'BOOKSHELF', 4, 0);
add_furn('clock_1', 'CLOCK', 6, 0);
add_furn('plant_1', 'PLANT', 1, 1);
add_furn('plant_2', 'PLANT', 8, 1);

// Desks
add_furn('desk_1', 'DESK_FRONT', 2, 4);
add_furn('pc_1', 'PC_FRONT_ON_1', 2, 4);
add_furn('chair_1', 'WOODEN_CHAIR_FRONT', 2, 6);

add_furn('desk_2', 'DESK_FRONT', 6, 4);
add_furn('pc_2', 'PC_FRONT_ON_2', 6, 4);
add_furn('chair_2', 'WOODEN_CHAIR_FRONT', 6, 6);

// Big Table in Left Bottom
add_furn('desk_3', 'DESK_FRONT', 2, 9);
add_furn('pc_3', 'PC_FRONT_ON_3', 2, 9);
add_furn('desk_4', 'DESK_FRONT', 5, 9);
add_furn('pc_4', 'PC_FRONT_ON_1', 5, 9);

// Right Room: Lounge
add_furn('painting_1', 'LARGE_PAINTING', 14, 0);
add_furn('plant_3', 'LARGE_PLANT', 11, 1);
add_furn('plant_4', 'LARGE_PLANT', 18, 1);

const PINK_SOFA = { h: 330, s: 60, b: 20, c: 0 };
add_furn('coffee_table_1', 'COFFEE_TABLE', 14, 5);
add_furn('sofa_top', 'SOFA_FRONT', 14, 4, { color: PINK_SOFA });
add_furn('sofa_bottom', 'SOFA_BACK', 14, 7, { color: PINK_SOFA });
add_furn('sofa_left', 'SOFA_SIDE', 13, 5, { color: PINK_SOFA });
add_furn('sofa_right', 'SOFA_SIDE', 16, 5, { color: PINK_SOFA, mirrored: true });

const layout = {
  version: 1,
  cols: COLS,
  rows: ROWS,
  layoutRevision: 2,
  tiles: tiles,
  tileColors: tileColors,
  furniture: furniture,
};

fs.writeFileSync('office-redesign.json', JSON.stringify(layout, null, 2));
console.log('Generated office-redesign.json');
