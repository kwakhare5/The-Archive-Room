import type { ColorValue } from '@/shared/types/types';

function ColorSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold text-text-muted w-6 text-left shrink-0 font-mono">{label}</span>
      <div className="relative flex-1 flex items-center group">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1 bg-bg-dark border border-border appearance-none cursor-pointer accent-accent
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
            [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-accent/50
            [&::-webkit-slider-thumb]:hover:brightness-110 [&::-webkit-slider-thumb]:active:scale-95 transition-all"
        />
      </div>
      <span className="text-[10px] font-mono text-text-muted w-8 text-right shrink-0 opacity-60">{value}</span>
    </div>
  );
}

interface ColorPickerProps {
  value: ColorValue;
  onChange: (color: ColorValue) => void;
  /** Force colorize-style H/S ranges (H: 0–360, S: 0–100) */
  colorize?: boolean;
  /** Show a colorize checkbox that lets the user toggle the mode */
  showColorizeToggle?: boolean;
}

export function ColorPicker({ value, onChange, colorize, showColorizeToggle }: ColorPickerProps) {
  const handleChange = (key: keyof ColorValue, v: number) => {
    onChange({ ...value, [key]: v });
  };

  const isColorize = colorize || !!value.colorize;

  return (
    <div className="flex flex-col gap-3 py-4 px-6 bg-bg-dark border-2 border-border rounded-none">
      <ColorSlider
        label="H"
        value={value.h}
        min={isColorize ? 0 : -180}
        max={isColorize ? 360 : 180}
        onChange={(v) => handleChange('h', v)}
      />
      <ColorSlider
        label="S"
        value={value.s}
        min={isColorize ? 0 : -100}
        max={100}
        onChange={(v) => handleChange('s', v)}
      />
      <ColorSlider
        label="B"
        value={value.b}
        min={-100}
        max={100}
        onChange={(v) => handleChange('b', v)}
      />
      <ColorSlider
        label="C"
        value={value.c}
        min={-100}
        max={100}
        onChange={(v) => handleChange('c', v)}
      />
      {showColorizeToggle && (
        <label className="flex items-center gap-4 text-sm text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={!!value.colorize}
            onChange={(e) => onChange({ ...value, colorize: e.target.checked || undefined })}
            className="accent-accent"
          />
          Colorize
        </label>
      )}
    </div>
  );
}

