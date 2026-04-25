import { Button } from '../ui/Button';

interface MigrationNoticeProps {
  onDismiss: () => void;
}

export function MigrationNotice({ onDismiss }: MigrationNoticeProps) {
  return (
    <div
      className="absolute inset-0 bg-accent/20 backdrop-blur-sm flex items-center justify-center z-[100]"
      onClick={onDismiss}
    >
      <div
        className="max-w-[600px] pixel-panel-double p-12 bg-bg flex flex-col items-center text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[10px] uppercase font-bold text-accent tracking-[0.4em] mb-4 opacity-50">Operational Update</div>
        <h1 className="text-xl font-bold mb-8 text-text uppercase tracking-[0.2em]">Welcome to The Archive Room</h1>
        
        <div className="w-16 h-[1px] bg-border mb-8" />
        
        <p className="text-sm m-0 mb-6 leading-relaxed text-text-muted">
          WE HAVE RECONSTRUCTED THE ARCHIVE ARCHITECTURE FOR INDEPENDENT OPERATION.
          THIS EVOLUTION REQUIRED A SYSTEM-WIDE LAYOUT RESET.
        </p>
        <p className="text-sm m-0 mb-12 leading-relaxed text-text-muted italic">
          WE APOLOGIZE FOR THE DISRUPTION TO YOUR SPATIAL MASTER-PLAN.
        </p>
        
        <div className="w-full flex flex-col gap-4">
          <Button variant="accent" size="lg" onClick={onDismiss} className="py-6 tracking-[0.3em] uppercase">
            AUTHORIZE INITIALIZATION
          </Button>
        </div>
      </div>
    </div>
  );
}
