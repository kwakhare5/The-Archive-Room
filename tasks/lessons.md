# Lessons Learned & Failure Patterns

## Documentation Recovery
- **Pattern**: When a user mentions a "big asf" or "long" `CLAUDE.md`, do not settle for a basic reconstruction from recent logs or a standard `README.md`.
- **Root Cause**: Confusing the "Roadmap" version of `CLAUDE.md` with the "Compressed Reference" version which contains the ASCII diagrams and deep FSM logic.
- **Rule**: Always search for "Compressed Reference" or "Three Zones" keywords when restoring documentation for this project.
- **Correction Date**: 2026-04-22

## Engineering Constraints
- **Tile Size**: Never assume 32px. `TILE_SIZE` is strictly **16px**.
- **Sprite Slicing**: Standard `slice()` on `SpriteData` (2D array) returns rows, not columns. Flattening must account for this.
