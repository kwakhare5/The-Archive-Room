import type { ReactNode } from 'react';

import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** z-index for backdrop (modal gets +1). Default 49 */
  zIndex?: number;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  zIndex = 50,
  className = '',
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-[2px]" style={{ zIndex }} onClick={onClose} />
      <div
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg border border-border rounded-none shadow-pixel p-2 min-w-xs ${className}`}
        style={{ zIndex: zIndex + 1 }}
      >
        <div className="flex items-center justify-between py-6 px-10 border-b border-border mb-4 bg-bg-dark">
          <span className="text-accent font-bold uppercase tracking-widest text-lg">{title}</span>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-text-muted hover:text-text">
            ×
          </Button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </>
  );
}
