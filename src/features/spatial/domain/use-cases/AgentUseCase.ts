import { Agent } from '../models/Agent';
import { AgentState } from '../models/AgentState';
import { WorldState } from '../models/WorldState';
import { Seat } from '../models/Seat';
import { Direction } from '../models/Direction';
import { WorldNotifier } from '../services/WorldNotifier';
import { TILE_SIZE } from '@/shared/types/types'; 
import { updateAgent } from './AgentPhysics';
import { matrixEffectSeeds } from '@/features/agents/logic/matrixEffect';
import { getLoadedCharacterCount } from '@/shared/lib/engine/sprites/characterSpriteManifest';
import { 
  MATRIX_EFFECT_DURATION_SEC 
} from '@/shared/constants/config';

export class AgentUseCase {
  constructor(
    private agents: Map<number, Agent>,
    private notifier: WorldNotifier
  ) {}

  public createAgent(
    id: number,
    palette: number,
    hueShift: number,
    seatId: string | null,
    seat: Seat | null
  ): Agent {
    const col = seat ? seat.seatCol : 1;
    const row = seat ? seat.seatRow : 1;
    
    const agent: Agent = {
      id,
      state: seat ? AgentState.TYPE : AgentState.IDLE,
      dir: seat ? seat.facingDir : Direction.DOWN,
      x: col + 0.5,
      y: row + 0.5,
      tileCol: col,
      tileRow: row,
      path: [],
      moveProgress: 0,
      isActive: true,
      seatId,
      isSeated: !!seat,
      activeCommand: null,
      targetFurnitureUid: null,
      interactionTimer: 0,
      currentTool: null,
      isSubagent: false,
      parentAgentId: null,
      palette,
      hueShift,
      frame: 0,
      frameTimer: 0,
      bubbleType: null,
      bubbleTimer: 0,
      seatTimer: 0,
      matrixEffect: 'spawn',
      matrixEffectTimer: 0,
      matrixEffectSeeds: matrixEffectSeeds(),
      inputTokens: 0,
      outputTokens: 0,
      targetUid: null,
      pendingCommand: null,
      pendingState: null,
    };

    this.agents.set(id, agent);
    return agent;
  }

  public removeAgent(id: number): void {
    const agent = this.agents.get(id);
    if (!agent || agent.matrixEffect === 'despawn') return;

    agent.matrixEffect = 'despawn';
    agent.matrixEffectTimer = 0;
    agent.matrixEffectSeeds = matrixEffectSeeds();
    agent.bubbleType = null;
  }

  public update(dt: number, world: WorldState, onDeleted: (id: number) => void): void {
    const toDelete: number[] = [];

    for (const agent of this.agents.values()) {
      if (agent.matrixEffect) {
        agent.matrixEffectTimer += dt;
        if (agent.matrixEffectTimer >= MATRIX_EFFECT_DURATION_SEC) {
          if (agent.matrixEffect === 'spawn') {
            agent.matrixEffect = null;
          } else {
            toDelete.push(agent.id);
          }
        }
        continue;
      }

      // The core physics/logic update
      updateAgent(
        agent, 
        dt, 
        world, 
        (id, uid, cmd) => this.notifier.notifyArrival(id, uid, cmd),
        (id, cmd) => this.notifier.notifyInteractionComplete(id, cmd)
      );

      if (agent.bubbleType === 'waiting') {
        agent.bubbleTimer -= dt;
        if (agent.bubbleTimer <= 0) {
          agent.bubbleType = null;
          agent.bubbleTimer = 0;
        }
      }
    }

    for (const id of toDelete) {
      this.agents.delete(id);
      onDeleted(id);
    }
  }

  public pickDiversePalette(): { palette: number; hueShift: number } {
    const paletteCount = getLoadedCharacterCount();
    const counts = new Array(paletteCount).fill(0);
    for (const agent of this.agents.values()) {
      if (!agent.isSubagent && agent.palette < paletteCount) {
        counts[agent.palette]++;
      }
    }
    const minCount = Math.min(...counts);
    const available = counts.map((c, i) => c === minCount ? i : -1).filter(i => i !== -1);
    return { palette: available[Math.floor(Math.random() * available.length)], hueShift: 0 };
  }
}
