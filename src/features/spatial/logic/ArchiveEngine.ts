import { Agent } from '../domain/models/Agent';
import { Seat } from '../domain/models/Seat';
import { WorldState, ArchiveLayout } from '../domain/models/WorldState';
import { AgentUseCase } from '../domain/use-cases/AgentUseCase';
import { SeatUseCase } from '../domain/use-cases/SeatUseCase';
import { LayoutUseCase } from '../domain/use-cases/LayoutUseCase';
import { CommandUseCase } from '../domain/use-cases/CommandUseCase';
import { VscodeWorldNotifier } from '../infrastructure/persistence/VscodeWorldNotifier';
import { InputManager } from './managers/InputManager'; // Still an adapter for now
import { vscode } from '@/shared/lib/apiBridge';
import { TILE_SIZE, FurnitureInstance } from '@/shared/types/types';
import { archiveToFurnitureInstances } from './nexusSerializer';
import { getCatalogEntry } from './furnitureCatalog';

/**
 * ArchiveEngine (Interface Adapter / Orchestrator)
 * 
 * In Clean Architecture, this acts as the primary Controller.
 * It coordinates domain use cases to fulfill user and system requests.
 */
export class ArchiveEngine {
  private agentUseCase: AgentUseCase;
  private seatUseCase: SeatUseCase;
  private layoutUseCase: LayoutUseCase;
  private commandUseCase: CommandUseCase;
  public input: InputManager;
  
  private world: WorldState;
  private agents: Map<number, Agent> = new Map();
  private furnitureInstances: FurnitureInstance[] = [];
  
  // Interaction State (Infrastructure/UI state)
  public hoveredTile: { col: number; row: number } | null = null;
  public selectedAgentId: number | null = null;
  public cameraFollowId: number | null = null;
  public hoveredAgentId: number | null = null;

  constructor(layout?: ArchiveLayout) {
    const notifier = new VscodeWorldNotifier();
    
    this.layoutUseCase = new LayoutUseCase();
    this.agentUseCase = new AgentUseCase(this.agents, notifier);
    this.seatUseCase = new SeatUseCase();
    this.commandUseCase = new CommandUseCase(notifier);
    
    this.world = this.layoutUseCase.createInitialWorld(layout);
    this.furnitureInstances = archiveToFurnitureInstances(this.world.layout.furniture);
    this.input = new InputManager(this);
  }

  public getWorldContext(): WorldState {
    return this.world;
  }

  // --- Layout Domain Proxies ---

  public get layout(): ArchiveLayout { return this.world.layout; }
  public get tileMap() { return this.world.tileMap; }
  public get seats() { return this.world.seats; }
  public get blockedTiles() { return this.world.blockedTiles; }
  public get walkableTiles() { return this.world.walkableTiles; }
  public get furniture() { return this.furnitureInstances; }
  public get characters() { return this.agents; }

  public rebuildFromLayout(layout: ArchiveLayout, shift?: { col: number; row: number }): void {
    this.world = this.layoutUseCase.rebuildWorld(layout);
    this.furnitureInstances = archiveToFurnitureInstances(this.world.layout.furniture);
    
    for (const agent of this.agents.values()) {
      agent.hueShift = 0;
      if (shift && (shift.col !== 0 || shift.row !== 0)) {
        agent.tileCol += shift.col;
        agent.tileRow += shift.row;
        agent.x += shift.col;
        agent.y += shift.row;
        agent.path = [];
        agent.moveProgress = 0;
      }
    }

    for (const seat of this.world.seats.values()) seat.assigned = false;

    // Sync agents with new seats
    for (const agent of this.agents.values()) {
      if (agent.seatId) {
        const seat = this.world.seats.get(agent.seatId);
        if (seat && !seat.assigned) {
          seat.assigned = true;
          agent.tileCol = seat.seatCol;
          agent.tileRow = seat.seatRow;
          agent.x = seat.seatCol + 0.5;
          agent.y = seat.seatRow + 0.5;
          agent.dir = seat.facingDir;
          continue;
        }
      }
      agent.seatId = null;
    }

    // Re-assign agents without seats
    for (const agent of this.agents.values()) {
      if (agent.seatId) continue;
      const seatId = this.seatUseCase.findFreeSeat(this.layout, this.seats);
      if (seatId) {
        this.seatUseCase.assignSeat(seatId, this.seats);
        agent.seatId = seatId;
        const seat = this.seats.get(seatId)!;
        agent.tileCol = seat.seatCol;
        agent.tileRow = seat.seatRow;
        agent.x = seat.seatCol + 0.5;
        agent.y = seat.seatRow + 0.5;
        agent.dir = seat.facingDir;
      }
    }
  }

  // --- Agent Domain Proxies ---

  public addAgent(id: number, preferredPalette?: number, _hueShift?: number, preferredSeatId?: string, skipSpawnEffect?: boolean, folderName?: string): void {
    if (this.agents.has(id)) return;

    const paletteInfo = preferredPalette !== undefined 
      ? { palette: preferredPalette, hueShift: 0 } 
      : this.agentUseCase.pickDiversePalette();

    let seatId: string | null = null;
    if (preferredSeatId && this.seats.has(preferredSeatId)) {
      const seat = this.seats.get(preferredSeatId)!;
      if (!seat.assigned) seatId = preferredSeatId;
    }
    if (!seatId) seatId = this.seatUseCase.findFreeSeat(this.layout, this.seats);

    const seat = seatId ? this.seats.get(seatId)! : null;
    if (seatId) this.seatUseCase.assignSeat(seatId, this.seats);

    const agent = this.agentUseCase.createAgent(id, paletteInfo.palette, paletteInfo.hueShift, seatId, seat);
    if (folderName) agent.folderName = folderName;
    if (skipSpawnEffect) agent.matrixEffect = null;
  }

  public addSubagent(parentAgentId: number, toolId: string): number {
    const parentAgent = this.agents.get(parentAgentId);
    if (!parentAgent) return -1;

    // Unique subagent ID based on parent and tool hash
    const subId = parentAgentId * 1000 + (Math.abs(this.hashCode(toolId)) % 1000);
    if (this.agents.has(subId)) return subId;

    this.addAgent(subId, parentAgent.palette, parentAgent.hueShift, undefined, false);
    const subAgent = this.agents.get(subId);
    if (subAgent) {
      subAgent.isSubagent = true;
      subAgent.parentAgentId = parentAgentId;
      subAgent.parentToolId = toolId;
    }
    return subId;
  }

  public getSubagentId(parentAgentId: number, toolId: string): number | null {
    const subId = parentAgentId * 1000 + (Math.abs(this.hashCode(toolId)) % 1000);
    return this.agents.has(subId) ? subId : null;
  }

  private hashCode(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  public removeAgent(id: number): void {
    const agent = this.agents.get(id);
    if (!agent) return;
    if (agent.seatId) this.seatUseCase.unassignSeat(agent.seatId, this.seats);
    this.agentUseCase.removeAgent(id);
  }

  public removeAllSubagents(parentAgentId: number): void {
    for (const [id, agent] of this.agents.entries()) {
      if (agent.isSubagent && agent.parentAgentId === parentAgentId) {
        this.removeAgent(id);
      }
    }
  }

  public removeSubagent(parentAgentId: number, toolId: string): void {
    const subId = this.getSubagentId(parentAgentId, toolId);
    if (subId !== null) this.removeAgent(subId);
  }

  public setAgentActive(id: number, active: boolean): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.isActive = active;
      if (!active) {
        agent.seatTimer = -1;
        agent.path = [];
        agent.moveProgress = 0;
      }
    }
  }

  public setAgentTool(agentId: number, toolName: string | null): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.bubbleText = toolName ?? '';
    }
  }

  public reassignSeat(agentId: number, seatId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Unassign old seat
    if (agent.seatId) this.seatUseCase.unassignSeat(agent.seatId, this.seats);

    // Assign new seat
    this.seatUseCase.assignSeat(seatId, this.seats);
    agent.seatId = seatId;
    this.sendToSeat(agentId);
  }

  public sendToSeat(agentId: number): void {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.seatId) return;
    const seat = this.seats.get(agent.seatId);
    if (!seat) return;

    this.walkToTile(agentId, seat.seatCol, seat.seatRow);
  }

  // --- Command Domain Proxies ---

  public executeCommand(agentId: number, command: string, target?: string): { success: boolean; error?: string } {
    const agent = this.agents.get(agentId);
    if (!agent) return { success: false, error: 'Agent not found' };
    
    return this.commandUseCase.executeCommand(
      agent, command, target, this.world,
      (uid) => this.layoutUseCase.resolveInteractionTarget(this.world, uid),
      (a, fn) => this.withOwnSeatUnblocked(a, fn)
    );
  }

  public walkToTile(agentId: number, col: number, row: number): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    return this.commandUseCase.walkToTile(
      agent, col, row, this.world,
      (a, fn) => this.withOwnSeatUnblocked(a, fn),
      this.ownSeatKey(agent)
    );
  }

  public persistSeatAssignments(): void {
    const seats: Record<number, { palette: number; seatId: string | null }> = {};
    for (const agent of this.agents.values()) {
      if (agent.isSubagent) continue;
      seats[agent.id] = { palette: agent.palette, seatId: agent.seatId };
    }
    vscode.postMessage({ type: 'saveAgentSeats', seats });
  }

  // --- Update Loop ---

  public update(dt: number): void {
    this.layoutUseCase.update(dt, this.world, this.agents);
    this.agentUseCase.update(dt, this.world, (id) => {
      // Cleanup when agent is fully removed after despawn effect
    });
  }

  // --- Internal Logic (Adapters for Legacy Behavior) ---

  private withOwnSeatUnblocked<T>(agent: Agent, fn: () => T): T {
    const key = this.ownSeatKey(agent);
    const wasBlocked = key ? this.world.blockedTiles.has(key) : false;
    if (key && wasBlocked) this.world.blockedTiles.delete(key);
    try {
      return fn();
    } finally {
      if (key && wasBlocked) this.world.blockedTiles.add(key);
    }
  }

  private ownSeatKey(agent: Agent): string | null {
    if (!agent.seatId) return null;
    const seat = this.world.seats.get(agent.seatId);
    if (!seat) return null;
    return `${seat.seatCol},${seat.seatRow}`;
  }

  public dismissBubble(agentId: number): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.bubbleType = null;
      agent.bubbleText = '';
    }
  }

  public clearPermissionBubble(agentId: number): void {
    const agent = this.agents.get(agentId);
    if (agent && agent.bubbleType === 'permission') {
      agent.bubbleType = null;
    }
  }

  public showWaitingBubble(agentId: number): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.bubbleType = 'waiting';
      agent.bubbleTimer = 0;
    }
  }

  public showPermissionBubble(agentId: number): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.bubbleType = 'permission';
      agent.bubbleTimer = 0;
    }
  }

  public setTeamInfo(id: number, teamName?: string, agentName?: string, isTeamLead?: boolean, leadAgentId?: number, teamUsesTmux?: boolean): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.teamName = teamName;
      agent.agentName = agentName;
      agent.isTeamLead = isTeamLead;
      agent.leadAgentId = leadAgentId;
      agent.teamUsesTmux = teamUsesTmux;
    }
  }

  public setAgentTokens(id: number, inputTokens: number, outputTokens: number): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.inputTokens = inputTokens;
      agent.outputTokens = outputTokens;
    }
  }

  // --- External API Bridge Helpers ---

  public getCharacterAt(worldX: number, worldY: number): number | null {
    // Basic hit testing: check distance to each agent
    for (const agent of this.agents.values()) {
      const dx = agent.x - worldX;
      const dy = agent.y - worldY;
      // Rough hit area (16px radius)
      if (Math.sqrt(dx * dx + dy * dy) < 16) return agent.id;
    }
    return null;
  }

  public getFurnitureAt(col: number, row: number) {
    // Proxy to domain catalog logic if needed, or simple layout scan
    for (const f of this.world.layout.furniture) {
      const entry = getCatalogEntry(f.type);
      if (!entry) continue;
      if (col >= f.col && col < f.col + entry.footprintW && row >= f.row && row < f.row + entry.footprintH) {
        return f;
      }
    }
    return null;
  }

  public handleFurnitureClick(agentId: number, furnitureUid: string): boolean {
    // For now, default to THINK command or similar interaction logic
    const res = this.executeCommand(agentId, 'THINK', furnitureUid);
    return res.success;
  }

  public getSeatAtTile(col: number, row: number): string | null {
    for (const [uid, seat] of this.world.seats) {
      if (seat.seatCol === col && seat.seatRow === row) return uid;
    }
    return null;
  }

  // --- Legacy UI Bridge ---
  public getCharacters(): Agent[] { return Array.from(this.agents.values()); }
  public getLayout(): ArchiveLayout { return this.world.layout; }
  
  public setHoveredTile(tile: { col: number; row: number } | null) { this.hoveredTile = tile; }
  public setHoveredAgentId(id: number | null) { this.hoveredAgentId = id; }
  public setCameraFollowId(id: number | null) { this.cameraFollowId = id; }
  public setSelectedAgentId(id: number | null) { this.selectedAgentId = id; }
}
