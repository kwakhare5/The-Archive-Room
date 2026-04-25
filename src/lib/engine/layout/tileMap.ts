import { TileType } from '@/lib/engine/types';

/** Check if a tile is walkable (floor, carpet, or doorway, and not blocked by furniture) */
export function isWalkable(
  col: number,
  row: number,
  tileMap: TileType[][],
  blockedTiles: Set<string>,
): boolean {
  const rows = tileMap.length;
  const cols = rows > 0 ? tileMap[0].length : 0;
  if (row < 0 || row >= rows || col < 0 || col >= cols) return false;
  const t = tileMap[row][col];
  
  // Broaden walkability: Allow all tiles EXCEPT walls (0) and manual wall tiles (100-186)
  // This ensures transition tiles and doorway thresholds are considered walkable.
  const isWall = t === TileType.WALL || (t >= 100 && t <= 186);
  if (isWall) return false;

  if (blockedTiles.has(`${col},${row}`)) return false;
  return true;
}

/** Get walkable tile positions (grid coords) for wandering */
export function getWalkableTiles(
  tileMap: TileType[][],
  blockedTiles: Set<string>,
): Array<{ col: number; row: number }> {
  const rows = tileMap.length;
  const cols = rows > 0 ? tileMap[0].length : 0;
  const tiles: Array<{ col: number; row: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isWalkable(c, r, tileMap, blockedTiles)) {
        tiles.push({ col: c, row: r });
      }
    }
  }
  return tiles;
}

/** Smooth A* pathfinding on 4-connected grid (no diagonals).
 *  Uses turn penalties to avoid unnecessary zig-zags and expanded walkability for wide openings.
 *  Returns path excluding start, including end. */
export function findPath(
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
  tileMap: TileType[][],
  blockedTiles: Set<string>,
): Array<{ col: number; row: number }> {
  if (startCol === endCol && startRow === endRow) return [];

  const key = (c: number, r: number, dir: number) => `${c},${r},${dir}`;
  const endKey = (c: number, r: number) => `${c},${r}`;
  const targetKey = endKey(endCol, endRow);

  // End must be walkable
  if (!isWalkable(endCol, endRow, tileMap, blockedTiles)) return [];

  // Manhattan distance heuristic
  const h = (c: number, r: number) => Math.abs(c - endCol) + Math.abs(r - endRow);

  // Priority queue for A* (col, row, prevDir, priority)
  // Directions: 0:UP, 1:RIGHT, 2:DOWN, 3:LEFT, 4:NONE
  const openSet: Array<{ col: number; row: number; prevDir: number; priority: number }> = [
    { col: startCol, row: startRow, prevDir: 4, priority: h(startCol, startRow) },
  ];

  const gScore = new Map<string, number>();
  gScore.set(key(startCol, startRow, 4), 0);

  const parent = new Map<string, { col: number; row: number; prevDir: number }>();

  const dirs = [
    { dc: 0, dr: -1, id: 0 }, // UP
    { dc: 1, dr: 0, id: 1 },  // RIGHT
    { dc: 0, dr: 1, id: 2 },  // DOWN
    { dc: -1, dr: 0, id: 3 }, // LEFT
  ];

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.priority - b.priority);
    const curr = openSet.shift()!;
    const currKey = key(curr.col, curr.row, curr.prevDir);

    if (endKey(curr.col, curr.row) === targetKey) {
      const path: Array<{ col: number; row: number }> = [];
      let k = curr;
      while (k.col !== startCol || k.row !== startRow) {
        path.unshift({ col: k.col, row: k.row });
        const p = parent.get(key(k.col, k.row, k.prevDir));
        if (!p) break;
        k = p;
      }
      return path;
    }

    for (const d of dirs) {
      const nc = curr.col + d.dc;
      const nr = curr.row + d.dr;
      const nk = key(nc, nr, d.id);

      if (!isWalkable(nc, nr, tileMap, blockedTiles)) continue;

      // HUMAN-LIKE LOGIC:
      // 1. Base cost = 1.0
      // 2. Turn penalty = 0.5 (makes straight lines much preferred)
      // 3. Tiny jitter = 0.05 (variety for wide openings without causing zig-zags)
      const isTurn = curr.prevDir !== 4 && curr.prevDir !== d.id;
      const stepCost = 1.0 + (isTurn ? 0.5 : 0) + Math.random() * 0.05;
      
      const tentativeGScore = (gScore.get(currKey) ?? Infinity) + stepCost;

      if (tentativeGScore < (gScore.get(nk) ?? Infinity)) {
        parent.set(nk, curr);
        gScore.set(nk, tentativeGScore);
        const priority = tentativeGScore + h(nc, nr);
        
        const existing = openSet.find(n => n.col === nc && n.row === nr && n.prevDir === d.id);
        if (existing) {
          existing.priority = priority;
        } else {
          openSet.push({ col: nc, row: nr, prevDir: d.id, priority });
        }
      }
    }
  }

  return [];
}
