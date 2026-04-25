import { findPath } from '@/features/spatial/logic/tileMap';
import { createCharacter, updateCharacter } from '@/features/agents/logic/characters';
import { matrixEffectSeeds } from '@/features/agents/logic/matrixEffect';
import type { Character, TileType as TileTypeVal } from '@/shared/types/types';
import { CharacterState, Direction, TILE_SIZE } from '@/shared/types/types';
import { getLoadedCharacterCount } from '@/shared/lib/engine/sprites/characterSpriteManifest';

export class CharacterManager {
  private characters: Map<number, Character> = new Map();
  private subagentIdMap: Map<string, number> = new Map();
  private subagentMeta: Map<number, { parentAgentId: number; parentToolId: string }> = new Map();
  private nextSubagentId = -1;

  public getCharacters(): Map<number, Character> {
    return this.characters;
  }

  public getCharacter(id: number): Character | undefined {
    return this.characters.get(id);
  }

  public pickDiversePalette(): { palette: number; hueShift: number } {
    const paletteCount = getLoadedCharacterCount();
    const counts = new Array(paletteCount).fill(0) as number[];
    for (const ch of this.characters.values()) {
      if (ch.isSubagent) continue;
      if (ch.palette < paletteCount) counts[ch.palette]++;
    }
    const minCount = Math.min(...counts);
    const available: number[] = [];
    for (let i = 0; i < paletteCount; i++) {
      if (counts[i] === minCount) available.push(i);
    }
    const palette = available[Math.floor(Math.random() * available.length)];
    return { palette, hueShift: 0 };
  }

  public addCharacter(ch: Character, skipSpawnEffect?: boolean): void {
    if (!skipSpawnEffect) {
      ch.matrixEffect = 'spawn';
      ch.matrixEffectTimer = 0;
      ch.matrixEffectSeeds = matrixEffectSeeds();
    }
    this.characters.set(ch.id, ch);
  }

  public removeCharacter(id: number): void {
    const ch = this.characters.get(id);
    if (!ch || ch.matrixEffect === 'despawn') return;
    ch.matrixEffect = 'despawn';
    ch.matrixEffectTimer = 0;
    ch.matrixEffectSeeds = matrixEffectSeeds();
    ch.bubbleType = null;
  }

  public updateCharacters(deltaTimeMs: number, tileMap: TileTypeVal[][], blockedTiles: Set<string>): void {
    const dt = deltaTimeMs / 1000;
    for (const [id, ch] of this.characters) {
      updateCharacter(ch, dt, [], new Map(), tileMap, blockedTiles);
      
      if (ch.matrixEffect === 'despawn' && ch.matrixEffectTimer >= 1.5) {
        this.characters.delete(id);
        if (ch.isSubagent) {
          const meta = this.subagentMeta.get(id);
          if (meta) {
            this.subagentIdMap.delete(`${meta.parentAgentId}:${meta.parentToolId}`);
            this.subagentMeta.delete(id);
          }
        }
      }
    }
  }

  public checkAgentHit(worldX: number, worldY: number): number | null {
    const CHARACTER_HIT_HALF_WIDTH = 12;
    const CHARACTER_HIT_HEIGHT = 48;
    for (const [id, ch] of this.characters) {
      if (ch.matrixEffect) continue;
      const xDiff = Math.abs(worldX - ch.x);
      const yDiff = worldY - ch.y;
      if (xDiff < CHARACTER_HIT_HALF_WIDTH && yDiff > -CHARACTER_HIT_HEIGHT && yDiff < 0) {
        return id;
      }
    }
    return null;
  }

  public destroy(): void {
    this.characters.clear();
    this.subagentIdMap.clear();
    this.subagentMeta.clear();
  }
}
