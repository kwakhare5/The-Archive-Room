import { useEffect, useRef } from 'react';

interface ItemSelectProps {
  width: number;
  height: number;
  selected: boolean;
  onClick: () => void;
  title: string;
  /** Called to draw content onto the canvas. Canvas is pre-sized and cleared. */
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  /** Dependencies that trigger a redraw */
  deps: unknown[];
}

export function ItemSelect({
  width,
  height,
  selected,
  onClick,
  title,
  draw,
  deps,
}: ItemSelectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);

    draw(ctx, width, height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1 rounded-sm cursor-pointer overflow-hidden shrink-0 border-2 transition-all pixel-magnetic ${
        selected 
          ? 'border-accent bg-accent/10 shadow-[0_0_8px_rgba(217,119,6,0.2)]' 
          : 'border-border/40 bg-bg-dark/20 hover:border-border'
      }`}
      style={{ width: width + 8, height: height + 8 }}
    >
      <canvas 
        ref={canvasRef} 
        className="block" 
        style={{ width, height, imageRendering: 'pixelated' }} 
      />
    </button>
  );
}
