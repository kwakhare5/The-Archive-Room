"use no memo";
import { useEffect, useLayoutEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  CHARACTER_SITTING_OFFSET_PX,
  FUEL_COLOR_CRITICAL,
  FUEL_COLOR_DANGER,
  FUEL_COLOR_OK,
  FUEL_COLOR_WARN,
  FUEL_GAUGE_BG,
  FUEL_GAUGE_HEIGHT_PX,
  FUEL_GAUGE_WIDTH_PX,
  MAX_CONTEXT_TOKENS,
  TEAM_LEAD_COLOR,
  TEAM_ROLE_COLOR,
  TOKEN_CRITICAL_THRESHOLD,
  TOKEN_DANGER_THRESHOLD,
  TOKEN_WARN_THRESHOLD,
  TOOL_OVERLAY_VERTICAL_OFFSET,
} from '@/lib/engine/constants';
import { getDPR } from '@/lib/engine/toolUtils';
import type { SubagentCharacter } from '@/hooks/useExtensionMessages';
import type { ArchiveEngine } from '@/lib/engine/engine/ArchiveEngine';
import type { ToolActivity } from '@/lib/engine/types';
import { CharacterState, TILE_SIZE } from '@/lib/engine/types';

interface ToolOverlayProps {
  archiveEngine: ArchiveEngine;
  agents: number[];
  agentTools: Record<number, ToolActivity[]>;
  subagentCharacters: SubagentCharacter[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  panRef: React.RefObject<{ x: number; y: number }>;
  onCloseAgent: (id: number) => void;
  alwaysShowOverlay: boolean;
}

/** Derive a short human-readable activity string from tools/status */
function getActivityText(
  agentId: number,
  agentTools: Record<number, ToolActivity[]>,
  isActive: boolean,
): string {
  const tools = agentTools[agentId];
  if (tools && tools.length > 0) {
    // Find the latest non-done tool
    const activeTool = [...tools].reverse().find((t) => !t.done);
    if (activeTool) {
      if (activeTool.permissionWait) return 'Needs approval';
      return activeTool.status;
    }
    // All tools done but agent still active (mid-turn) — keep showing last tool status
    if (isActive) {
      const lastTool = tools[tools.length - 1];
      if (lastTool) return lastTool.status;
    }
  }

  return 'Idle';
}

function getFuelColor(ratio: number): string {
  if (ratio >= TOKEN_CRITICAL_THRESHOLD) return FUEL_COLOR_CRITICAL;
  if (ratio >= TOKEN_DANGER_THRESHOLD) return FUEL_COLOR_DANGER;
  if (ratio >= TOKEN_WARN_THRESHOLD) return FUEL_COLOR_WARN;
  return FUEL_COLOR_OK;
}

export function ToolOverlay({
  archiveEngine,
  agents,
  agentTools,
  subagentCharacters,
  containerRef,
  zoom,
  panRef,
  onCloseAgent,
  alwaysShowOverlay,
}: ToolOverlayProps) {
  const [, setTick] = useState(0);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      setTick((n) => n + 1);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useLayoutEffect(() => {
    if (containerRef.current) {
      setContainerRect(containerRef.current.getBoundingClientRect());
    }
  }, [containerRef]);

  if (!containerRect) return null;

  const dpr = getDPR();
  const canvasW = Math.round(containerRect.width * dpr);
  const canvasH = Math.round(containerRect.height * dpr);
  const layout = archiveEngine.getLayout();
  const mapW = layout.cols * TILE_SIZE * zoom;
  const mapH = layout.rows * TILE_SIZE * zoom;
  const deviceOffsetX = Math.floor((canvasW - mapW) / 2) + Math.round(panRef.current?.x ?? 0);
  const deviceOffsetY = Math.floor((canvasH - mapH) / 2) + Math.round(panRef.current?.y ?? 0);

  const selectedId = archiveEngine.selectedAgentId;
  const hoveredId = archiveEngine.hoveredAgentId;

  // All character IDs
  const allIds = [...agents, ...subagentCharacters.map((s) => s.id)];

  return (
    <>
      {allIds.map((id) => {
        const ch = archiveEngine.characters.get(id);
        if (!ch) return null;

        const isSelected = selectedId === id;
        const isHovered = hoveredId === id;
        const isSub = ch.isSubagent;

        // Only show for hovered or selected agents (unless always-show is on)
        if (!alwaysShowOverlay && !isSelected && !isHovered) return null;

        // Position above character
        const sittingOffset = ch.state === CharacterState.TYPE ? CHARACTER_SITTING_OFFSET_PX : 0;
        const screenX = (deviceOffsetX + ch.x * zoom) / dpr;
        const screenY =
          (deviceOffsetY + (ch.y + sittingOffset - TOOL_OVERLAY_VERTICAL_OFFSET) * zoom) / dpr;

        // Get activity text
        const subHasPermission = isSub && ch.bubbleType === 'permission';
        let activityText: string;
        if (ch.bubbleText) {
          activityText = ch.bubbleText;
        } else if (isSub) {
          if (subHasPermission) {
            activityText = 'Needs approval';
          } else {
            const sub = subagentCharacters.find((s) => s.id === id);
            activityText = sub ? sub.label : 'Subtask';
          }
        } else {
          activityText = getActivityText(id, agentTools, ch.isActive);
        }

        // Determine dot color
        const tools = agentTools[id];
        const hasPermission = subHasPermission || tools?.some((t) => t.permissionWait && !t.done);
        const hasActiveTools = tools?.some((t) => !t.done);
        const isActive = ch.isActive;

        let dotColor: string | null = null;
        if (hasPermission) {
          dotColor = 'var(--color-status-permission)';
        } else if (isActive && hasActiveTools) {
          dotColor = 'var(--color-status-active)';
        }

        // Team info
        const isTeamAgent = !!ch.teamName;
        const teamRoleLabel = ch.isTeamLead ? 'LEAD' : ch.agentName || null;
        const totalTokens = ch.inputTokens + ch.outputTokens;
        const tokenRatio = totalTokens / MAX_CONTEXT_TOKENS;
        const hasExtraLines = !!(ch.folderName || teamRoleLabel);        return (
          <div
            key={id}
            className="absolute flex flex-col items-center -translate-x-1/2 pointer-events-none"
            style={{
              left: screenX,
              top: screenY - (hasExtraLines ? 30 : 24),
              opacity: alwaysShowOverlay && !isSelected && !isHovered ? (isSub ? 0.4 : 0.6) : 1,
              zIndex: isSelected ? 42 : 41,
            }}
          >
            <div className={`px-4 py-2 flex items-center gap-3 pixel-panel-double bg-bg border-border/60 ${isSelected ? 'pointer-events-auto' : ''}`}>
              {dotColor && (
                <div
                  className={`w-4 h-4 rounded-full shrink-0 ${isActive && !hasPermission ? 'pixel-pulse' : ''}`}
                  style={{ background: dotColor }}
                />
              )}
              <div className="flex flex-col leading-tight">
                {teamRoleLabel && (
                  <span
                    className="text-[10px] font-bold tracking-[0.2em] uppercase text-accent/60"
                  >
                    {teamRoleLabel}
                  </span>
                )}
                <span className="text-[12px] font-bold tracking-widest text-text uppercase">
                  {activityText}
                </span>
              </div>
              {isSelected && !isSub && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseAgent(id);
                  }}
                  className="ml-2 w-6 h-6 p-0 text-text-muted hover:text-danger border-none bg-transparent shadow-none"
                >
                  ×
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
