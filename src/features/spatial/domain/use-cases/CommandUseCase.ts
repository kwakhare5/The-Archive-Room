import { Agent } from '../models/Agent';
import { AgentState } from '../models/AgentState';
import { WorldState } from '../models/WorldState';
import { Direction } from '../models/Direction';
import { WorldNotifier } from '../services/WorldNotifier';
import { findPath, isWalkable } from '@/features/spatial/logic/tileMap';
import { 
  READ_INTERACTION_DURATION_SEC, 
  THINK_INTERACTION_DURATION_SEC, 
  DISCARD_INTERACTION_DURATION_SEC 
} from '@/shared/constants/config';

export class CommandUseCase {
  constructor(private notifier: WorldNotifier) {}

  public executeCommand(
    agent: Agent,
    command: string,
    target: string | undefined,
    world: WorldState,
    resolveTarget: (uid: string) => { col: number; row: number; facingDir: number } | null,
    unblockOwnSeat: (agent: Agent, fn: () => any) => any
  ): { success: boolean; error?: string } {
    const commandMap: Record<string, { state: AgentState; duration: number }> = {
      RAG_SEARCH:    { state: AgentState.READING,    duration: READ_INTERACTION_DURATION_SEC },
      FETCH_MEMORY:  { state: AgentState.READING,    duration: READ_INTERACTION_DURATION_SEC },
      THINK:         { state: AgentState.THINKING,   duration: THINK_INTERACTION_DURATION_SEC },
      TRIM_CONTEXT:  { state: AgentState.DISCARDING, duration: DISCARD_INTERACTION_DURATION_SEC },
      GENERATE_CODE: { state: AgentState.TYPE,       duration: 0 },
      WRITE_RESPONSE:{ state: AgentState.TYPE,       duration: 0 },
      WAIT:          { state: AgentState.IDLE,       duration: 0 },
    };

    const mapping = commandMap[command];
    if (!mapping) return { success: false, error: `Unknown command: ${command}` };

    // Set bubble indicators
    if (command === 'THINK') agent.bubbleType = 'thinking';
    else if (command === 'RAG_SEARCH' || command === 'FETCH_MEMORY') agent.bubbleType = 'reading';
    else if (command === 'GENERATE_CODE') agent.bubbleType = 'typing';
    else agent.bubbleType = null;
    agent.bubbleTimer = 0;

    const targetTile = target ? resolveTarget(target) : null;

    if (targetTile) {
      const path = unblockOwnSeat(agent, () =>
        findPath(agent.tileCol, agent.tileRow, targetTile.col, targetTile.row, world.tileMap, world.blockedTiles)
      );

      if (path.length > 0) {
        agent.isSeated = false;
        agent.path = path;
        agent.moveProgress = 0;
        agent.state = AgentState.WALK;
        agent.frame = 0;
        agent.frameTimer = 0;
        agent.activeCommand = command;
        agent.targetFurnitureUid = target ?? null;
        agent.interactionTimer = mapping.duration;
        agent.targetUid = target ?? null;
        agent.pendingCommand = command;
        agent.pendingState = mapping.state;
        agent.arrivalFacing = targetTile.facingDir;
        return { success: true };
      } else if (agent.tileCol === targetTile.col && agent.tileRow === targetTile.row) {
        agent.state = mapping.state;
        agent.isSeated = false;
        agent.activeCommand = command;
        agent.targetFurnitureUid = target ?? null;
        agent.interactionTimer = mapping.duration;
        agent.frame = 0;
        agent.frameTimer = 0;
        agent.dir = targetTile.facingDir as Direction;
        
        this.notifier.notifyArrival(agent.id, agent.targetFurnitureUid || 'unknown', agent.activeCommand);
        return { success: true };
      } else {
        return { success: false, error: `No path to ${target} for agent ${agent.id}` };
      }
    } else {
      agent.state = mapping.state;
      agent.activeCommand = command;
      agent.targetFurnitureUid = null;
      agent.interactionTimer = mapping.duration;
      agent.frame = 0;
      agent.frameTimer = 0;
      return { success: true };
    }
  }

  public walkToTile(
    agent: Agent, 
    col: number, 
    row: number, 
    world: WorldState,
    unblockOwnSeat: (agent: Agent, fn: () => any) => any,
    ownSeatKey: string | null
  ): boolean {
    if (agent.isSubagent) return false;
    if (!isWalkable(col, row, world.tileMap, world.blockedTiles)) {
      if (!ownSeatKey || ownSeatKey !== `${col},${row}`) return false;
    }
    const path = unblockOwnSeat(agent, () =>
      findPath(agent.tileCol, agent.tileRow, col, row, world.tileMap, world.blockedTiles)
    );
    if (path.length === 0) return false;
    agent.path = path;
    agent.moveProgress = 0;
    agent.state = AgentState.WALK;
    agent.frame = 0;
    agent.frameTimer = 0;
    return true;
  }
}
