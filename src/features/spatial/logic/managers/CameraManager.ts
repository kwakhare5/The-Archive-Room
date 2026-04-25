import { TILE_SIZE } from '@/shared/types/types';

export class CameraManager {
  private cameraFollowId: number | null = null;
  private cameraX: number = 0;
  private cameraY: number = 0;

  public setFollowTarget(id: number | null): void {
    this.cameraFollowId = id;
  }

  public getFollowTarget(): number | null {
    return this.cameraFollowId;
  }

  public updateCamera(
    trackedCharacter: { x: number; y: number } | null,
    canvasWidth: number,
    canvasHeight: number,
    zoom: number
  ): void {
    if (this.cameraFollowId !== null && trackedCharacter) {
      // Smooth follow logic could be added here
      this.cameraX = trackedCharacter.x - canvasWidth / (2 * zoom);
      this.cameraY = trackedCharacter.y - canvasHeight / (2 * zoom);
    }
  }

  public getViewportOffset(): { x: number; y: number } {
    return { x: this.cameraX, y: this.cameraY };
  }

  public worldToScreen(worldX: number, worldY: number, zoom: number, panOffset: { x: number; y: number }): { x: number; y: number } {
    return {
      x: (worldX - this.cameraX) * zoom + panOffset.x,
      y: (worldY - this.cameraY) * zoom + panOffset.y,
    };
  }

  public screenToWorld(screenX: number, screenY: number, zoom: number, panOffset: { x: number; y: number }): { x: number; y: number } {
    return {
      x: (screenX - panOffset.x) / zoom + this.cameraX,
      y: (screenY - panOffset.y) / zoom + this.cameraY,
    };
  }

  public destroy(): void {
    this.cameraFollowId = null;
    this.cameraX = 0;
    this.cameraY = 0;
  }
}
