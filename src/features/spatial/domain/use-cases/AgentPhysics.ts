import {
  TYPE_FRAME_DURATION_SEC,
  WALK_FRAME_DURATION_SEC,
  WALK_SPEED_PX_PER_SEC,
} from '@/shared/constants/config';
import { Agent } from '../models/Agent';
import { AgentState } from '../models/AgentState';
import { WorldState } from '../models/WorldState';
import { Direction } from '../models/Direction';
import { TILE_SIZE } from '@/shared/types/types';

/** Tools that show reading animation instead of typing */
const READING_TOOLS = new Set(['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch']);

export function isReadingTool(tool: string | null): boolean {
  if (!tool) return false;
  return READING_TOOLS.has(tool);
}

// Convert walking speed from px/sec to tiles/sec
const WALK_SPEED_TILES_PER_SEC = WALK_SPEED_PX_PER_SEC / TILE_SIZE;

export function updateAgent(
  agent: Agent,
  dt: number,
  world: WorldState,
  notifyArrival: (agentId: number, furnitureUid: string, command: string) => void,
  notifyInteractionComplete: (agentId: number, command: string) => void
): void {
  if (!agent.isActive && agent.state === AgentState.IDLE) return;

  switch (agent.state) {
    case AgentState.WALK:
      handleWalk(agent, dt, notifyArrival);
      break;
    case AgentState.TYPE:
    case AgentState.READING:
    case AgentState.THINKING:
    case AgentState.DISCARDING:
      handleInteracting(agent, dt, notifyInteractionComplete);
      break;
    case AgentState.IDLE:
      handleIdle(agent, dt, world);
      break;
  }

  // Animation frame updates
  updateAnimation(agent, dt);
}

function handleWalk(
  agent: Agent,
  dt: number,
  notifyArrival: (agentId: number, furnitureUid: string, command: string) => void
): void {
  if (agent.path.length === 0) {
    agent.state = AgentState.IDLE;
    return;
  }

  const target = agent.path[0];
  const targetX = target.col + 0.5;
  const targetY = target.row + 0.5;

  const dx = targetX - agent.x;
  const dy = targetY - agent.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  agent.dir = directionBetween(agent.tileCol, agent.tileRow, target.col, target.row);

  const moveDist = WALK_SPEED_TILES_PER_SEC * dt;

  if (dist <= moveDist) {
    agent.x = targetX;
    agent.y = targetY;
    agent.tileCol = target.col;
    agent.tileRow = target.row;
    agent.path.shift();

    if (agent.path.length === 0) {
      if (agent.pendingState) {
        agent.state = agent.pendingState;
        agent.pendingState = null;
        if (agent.arrivalFacing !== undefined) {
          agent.dir = agent.arrivalFacing as Direction;
        }
        notifyArrival(agent.id, agent.targetFurnitureUid || 'unknown', agent.activeCommand || 'unknown');
      } else {
        agent.state = AgentState.IDLE;
      }
    }
  } else {
    agent.x += (dx / dist) * moveDist;
    agent.y += (dy / dist) * moveDist;
  }
}

function directionBetween(
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
): Direction {
  const dc = toCol - fromCol;
  const dr = toRow - fromRow;
  if (dc > 0) return Direction.RIGHT;
  if (dc < 0) return Direction.LEFT;
  if (dr > 0) return Direction.DOWN;
  return Direction.UP;
}

function handleInteracting(
  agent: Agent,
  dt: number,
  notifyInteractionComplete: (agentId: number, command: string) => void
): void {
  if (agent.interactionTimer > 0) {
    agent.interactionTimer -= dt;
    if (agent.interactionTimer <= 0) {
      agent.interactionTimer = 0;
      if (agent.activeCommand && agent.activeCommand !== 'WAIT') {
        notifyInteractionComplete(agent.id, agent.activeCommand);
      }
      agent.activeCommand = null;
      agent.bubbleType = null;
    }
  }
}

function handleIdle(agent: Agent, dt: number, world: WorldState): void {
  if (agent.seatId) {
    const seat = world.seats.get(agent.seatId);
    if (seat) {
      const targetX = seat.seatCol + 0.5;
      const targetY = seat.seatRow + 0.5;
      const dx = targetX - agent.x;
      const dy = targetY - agent.y;
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
        agent.isSeated = true;
        agent.dir = seat.facingDir;
      } else {
        const moveDist = WALK_SPEED_TILES_PER_SEC * dt;
        const dist = Math.sqrt(dx * dx + dy * dy);
        agent.x += (dx / dist) * Math.min(moveDist, dist);
        agent.y += (dy / dist) * Math.min(moveDist, dist);
      }
    }
  }
}

function updateAnimation(agent: Agent, dt: number): void {
  agent.frameTimer += dt;
  const duration = agent.state === AgentState.WALK ? WALK_FRAME_DURATION_SEC : TYPE_FRAME_DURATION_SEC;
  if (agent.frameTimer >= duration) {
    agent.frameTimer %= duration;
    agent.frame = (agent.frame + 1) % 4;
  }
}
