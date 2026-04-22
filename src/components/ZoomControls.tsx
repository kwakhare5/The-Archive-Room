import { useEffect, useRef, useState } from 'react';

import {
  ZOOM_LEVEL_FADE_DELAY_MS,
  ZOOM_LEVEL_FADE_DURATION_SEC,
  ZOOM_LEVEL_HIDE_DELAY_MS,
  ZOOM_MAX,
  ZOOM_MIN,
} from '../lib/engine/constants';
import { Button } from './ui/Button';

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export function ZoomControls({ zoom, onZoomChange }: ZoomControlsProps) {
  const [showLevel, setShowLevel] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevZoomRef = useRef(zoom);

  const minDisabled = zoom <= ZOOM_MIN;
  const maxDisabled = zoom >= ZOOM_MAX;

  // Show zoom level briefly when zoom changes
  useEffect(() => {
    if (zoom === prevZoomRef.current) return;
    prevZoomRef.current = zoom;

    // Clear existing timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    setShowLevel(true);
    setFadeOut(false);

    // Start fade after delay
    fadeTimerRef.current = setTimeout(() => {
      setFadeOut(true);
    }, ZOOM_LEVEL_FADE_DELAY_MS);

    // Hide completely after delay
    timerRef.current = setTimeout(() => {
      setShowLevel(false);
      setFadeOut(false);
    }, ZOOM_LEVEL_HIDE_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [zoom]);

  return (
    <>
      {/* Zoom level indicator at top-center */}
      {showLevel && (
        <div
          className="absolute top-10 left-1/2 -translate-x-1/2 z-10 pixel-panel pb-4 px-16 text-lg select-none pointer-events-none"
          style={{
            opacity: fadeOut ? 0 : 1,
            transition: `opacity ${ZOOM_LEVEL_FADE_DURATION_SEC}s ease-out`,
          }}
        >
          {zoom}x
        </div>
      )}

      {/* Vertically stacked premium round buttons — top-left */}
      <div className="absolute top-8 left-8 z-50 flex flex-col gap-6">
        <Button
          size="icon_lg"
          onClick={() => onZoomChange(zoom + 1)}
          disabled={maxDisabled}
          className="w-14 h-14 rounded-full border-2 border-primary/30! shadow-xl backdrop-blur-md bg-white/20! hover:bg-white/40! transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoom in (Ctrl+Scroll)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5V19M5 12H19"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
        <Button
          size="icon_lg"
          onClick={() => onZoomChange(zoom - 1)}
          disabled={minDisabled}
          className="w-14 h-14 rounded-full border-2 border-primary/30! shadow-xl backdrop-blur-md bg-white/20! hover:bg-white/40! transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoom out (Ctrl+Scroll)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12H19"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </div>
    </>
  );
}
