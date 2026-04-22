import { Button } from '../ui/Button';

interface MigrationNoticeProps {
  onDismiss: () => void;
}

export function MigrationNotice({ onDismiss }: MigrationNoticeProps) {
  return (
    <div
      className="absolute inset-0 bg-black/70 flex items-center justify-center z-100"
      onClick={onDismiss}
    >
      <div
        className="max-w-[800px] bg-bg-light border-4 border-border p-20 shadow-pixel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-12 text-accent">Welcome to The Archive Room</div>
        <p className="text-xl m-0 mb-12">
          We've updated our architecture to work independently.
          Unfortunately, this means your previous layout had to be reset.
        </p>
        <p className="text-xl m-0 mb-12">We're really sorry about that.</p>
        <p className="text-xl m-0 mb-20">
          The good news? You now have a high-performance system for RAG visualization.
        </p>
        <p className="text-xl m-0 mb-20">Stay tuned, and thanks for using The Archive Room!</p>
        <Button variant="accent" size="xl" onClick={onDismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}
