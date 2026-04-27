export interface GameLoopOptions {
  update: (dt: number) => void;
  render: (ctx: CanvasRenderingContext2D) => void;
}

/**
 * startGameLoop
 * 
 * Standard requestAnimationFrame loop for the engine.
 * Handles the delta-time calculation and coordination between update and render steps.
 */
export function startGameLoop(
  canvas: HTMLCanvasElement,
  options: GameLoopOptions
): () => void {
  let lastTime = performance.now();
  let frameId: number;
  let running = true;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get 2D context from canvas');
    return () => {};
  }

  function loop(now: number) {
    if (!running) return;
    
    const dt = Math.min((now - lastTime) / 1000, 0.1); // cap dt to avoid spirals
    lastTime = now;

    options.update(dt);
    options.render(ctx!);

    frameId = requestAnimationFrame(loop);
  }

  frameId = requestAnimationFrame(loop);

  return () => {
    running = false;
    cancelAnimationFrame(frameId);
  };
}
