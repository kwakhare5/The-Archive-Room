import json

COLS = 20
ROWS = 12

# Tile IDs from types.ts
WALL_WHITE = 160
WALL_GRAY = 162
WALL_TRANSITION = 161
FLOOR_WOOD = 2
FLOOR_BLUE = 3
FLOOR_CHECKERED = 1 # Assuming Floor 1 is neutral/checkered

tiles = [0] * (COLS * ROWS)
tileColors = [None] * (COLS * ROWS)

# Defaults
DEFAULT_GRAY_COLOR = {"h": 230, "s": 15, "b": -20, "c": 0}
DEFAULT_WHITE_COLOR = {"h": 0, "s": 0, "b": 80, "c": 0}
WOOD_COLOR = {"h": 35, "s": 40, "b": 15, "c": 0}
BLUE_COLOR = {"h": 220, "s": 30, "b": -10, "c": 0}

for r in range(ROWS):
    for c in range(COLS):
        idx = r * COLS + c
        
        # Border Walls
        if r == 0:
            tiles[idx] = WALL_WHITE
            tileColors[idx] = DEFAULT_WHITE_COLOR
        elif r == ROWS - 1:
            tiles[idx] = WALL_GRAY
            tileColors[idx] = DEFAULT_GRAY_COLOR
        elif c == 0 or c == COLS - 1:
            tiles[idx] = WALL_GRAY
            tileColors[idx] = DEFAULT_GRAY_COLOR
        # Middle Wall with opening
        elif c == 10:
            if r < 3 or r > 6:
                tiles[idx] = WALL_GRAY
                tileColors[idx] = DEFAULT_GRAY_COLOR
            else:
                # Opening
                if c <= 10:
                    tiles[idx] = FLOOR_WOOD
                    tileColors[idx] = WOOD_COLOR
                else:
                    tiles[idx] = FLOOR_BLUE
                    tileColors[idx] = BLUE_COLOR
        # Floors
        elif c < 10:
            tiles[idx] = FLOOR_WOOD
            tileColors[idx] = WOOD_COLOR
        else:
            tiles[idx] = FLOOR_BLUE
            tileColors[idx] = BLUE_COLOR

# Furniture
furniture = []

def add_furn(uid, ftype, col, row, color=None, mirrored=False):
    item = {"uid": uid, "type": ftype, "col": col, "row": row}
    if color: item["color"] = color
    if mirrored: item["mirrored"] = True
    furniture.append(item)

# Left Room Decor
add_furn("bookshelf_1", "BOOKSHELF", 2, 0)
add_furn("bookshelf_2", "BOOKSHELF", 4, 0)
add_furn("clock_1", "CLOCK", 6, 0)
add_furn("plant_1", "PLANT", 1, 1)
add_furn("plant_2", "PLANT", 8, 1)

# Left Room Desks
add_furn("desk_1", "DESK_FRONT", 2, 3)
add_furn("pc_1", "PC_FRONT_ON_1", 2, 3)
add_furn("chair_1", "WOODEN_CHAIR_FRONT", 2, 5)

add_furn("desk_2", "DESK_FRONT", 6, 3)
add_furn("pc_2", "PC_FRONT_ON_2", 6, 3)
add_furn("chair_2", "WOODEN_CHAIR_FRONT", 6, 5)

# Left Room Bottom Table (Cluster)
add_furn("desk_3", "DESK_FRONT", 2, 8)
add_furn("pc_3", "PC_FRONT_ON_3", 2, 8)
add_furn("desk_4", "DESK_FRONT", 5, 8)
add_furn("pc_4", "PC_FRONT_ON_1", 5, 8)

# Right Room Decor
add_furn("painting_1", "LARGE_PAINTING", 14, 0)
add_furn("plant_3", "LARGE_PLANT", 11, 1)
add_furn("plant_4", "LARGE_PLANT", 18, 1)

# Right Room Lounge
PINK_COLOR = {"h": 330, "s": 60, "b": 20, "c": 0}
add_furn("coffee_table_1", "COFFEE_TABLE", 14, 5)
add_furn("sofa_top", "SOFA_FRONT", 14, 4, color=PINK_COLOR)
add_furn("sofa_bottom", "SOFA_BACK", 14, 7, color=PINK_COLOR)
add_furn("sofa_left", "SOFA_SIDE", 13, 5, color=PINK_COLOR)
add_furn("sofa_right", "SOFA_SIDE", 16, 5, color=PINK_COLOR, mirrored=True)

layout = {
    "version": 1,
    "cols": COLS,
    "rows": ROWS,
    "layoutRevision": 1,
    "tiles": tiles,
    "tileColors": tileColors,
    "furniture": furniture
}

with open("office-redesign.json", "w") as f:
    json.dump(layout, f, indent=2)
