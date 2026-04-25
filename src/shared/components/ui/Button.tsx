import type { ButtonHTMLAttributes } from 'react';

const base = 'border rounded-none cursor-pointer font-bold uppercase tracking-widest transition-all';

const sizes = {
  sm: 'py-1 px-8 text-sm',
  md: 'py-2 px-12',
  lg: 'py-2.5 px-14 text-sm',
  xl: 'py-6 px-24 text-xl',
  icon: 'p-0 w-16 h-16 flex items-center justify-center',
  icon_lg: 'p-0 w-40 h-40 flex items-center justify-center',
} as const;

const variants = {
  default: `${base} bg-btn-bg border-border text-text hover:bg-btn-hover hover:border-text-muted`,
  active: `${base} bg-active-bg border-accent text-accent shadow-pixel`,
  disabled: `${base} bg-btn-bg border-border text-text-muted cursor-not-allowed opacity-[var(--btn-disabled-opacity)]`,
  accent: `${base} bg-accent border-accent text-white hover:bg-accent-bright hover:border-accent-bright shadow-pixel`,
  ghost: `${base} bg-transparent text-text-muted border-transparent hover:text-text`,
} as const;

type ButtonVariant = keyof typeof variants;
type ButtonSize = keyof typeof sizes;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'default',
  size = 'lg',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button 
      className={`${variants[variant]} ${sizes[size]} magnetic-hover ${className}`} 
      {...props} 
    />
  );
}
