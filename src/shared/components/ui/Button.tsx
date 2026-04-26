import type { ButtonHTMLAttributes } from 'react';
import { Button as ShadcnButton } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link" | "active" | "accent";
  size?: "default" | "sm" | "lg" | "icon" | "icon-lg";
}

export function Button({
  variant = 'default',
  size = 'lg',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <ShadcnButton 
      variant={variant === 'active' ? 'outline' : variant as any}
      size={size as any}
      className={cn("magnetic-hover rounded-none uppercase tracking-[0.15em] font-black font-sans", className)} 
      {...props} 
    />
  );
}
