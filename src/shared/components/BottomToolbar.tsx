import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Dropdown } from '@/shared/components/ui/Dropdown';
import { vscode } from '@/shared/lib/apiBridge';
import type { WorkspaceFolder } from '@/shared/hooks/useExtensionMessages';
import { Plus, Settings, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomToolbarProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onToggleSettings: () => void;
  workspaceFolders: WorkspaceFolder[];
}

export function BottomToolbar({
  isEditMode,
  onToggleEditMode,
  onToggleSettings,
  workspaceFolders,
}: BottomToolbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="absolute bottom-12 left-12 z-50 flex items-center gap-6 font-mono p-2 pixel-floating rounded-none">
      {/* Settings Button */}
      <Button
        variant="secondary"
        size="icon"
        onClick={onToggleSettings}
        className="h-16 w-16 pixel-magnetic shadow-pixel rounded-none"
        title="Settings"
      >
        <Settings className="w-8 h-8" />
      </Button>

      {/* Edit Mode Toggle (Layout) */}
      <Button
        variant={isEditMode ? "outline" : "secondary"}
        size="lg"
        onClick={onToggleEditMode}
        className={cn(
          "h-16 px-10 flex items-center gap-4 pixel-magnetic shadow-pixel rounded-none",
          isEditMode && "bg-accent/20 border-accent/40 text-text"
        )}
      >
        <Layout className="w-8 h-8" />
        <span className="pixel-text-label text-[16px] whitespace-nowrap">{isEditMode ? 'EXIT_EDIT' : 'LAYOUT'}</span>
      </Button>

      <div className="relative">
        <Button
          variant={isDropdownOpen ? "outline" : "secondary"}
          size="lg"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={cn(
            "h-16 px-10 flex items-center gap-4 pixel-magnetic shadow-pixel rounded-none",
            isDropdownOpen && "border-accent bg-bg text-text shadow-[0_0_20px_rgba(217,119,6,0.1)]"
          )}
        >
          <Plus className="w-8 h-8" />
          <span className="pixel-text-label text-[16px] whitespace-nowrap">AGENT</span>
        </Button>

        <Dropdown 
          isOpen={isDropdownOpen} 
          className="w-80 p-4 bg-bg border-2 border-border flex flex-col gap-2 shadow-2xl rounded-none absolute bottom-full mb-6 left-0 animate-in slide-in-from-bottom-2 duration-300"
        >
          <div className="px-4 py-3 pixel-text-telemetry border-b border-border mb-2 text-center whitespace-nowrap">Node_Registry</div>
          {workspaceFolders.map((folder) => (
            <button
              key={folder.path}
              className="w-full text-left p-4 text-[12px] text-text hover:bg-bg-dark rounded-none transition-all uppercase tracking-widest flex items-center justify-between group/item"
              onClick={() => {
                vscode.postMessage({ type: 'spawnAgent', folderPath: folder.path, folderName: folder.name });
                setIsDropdownOpen(false);
              }}
            >
              <span className="whitespace-nowrap">{folder.name}</span>
              <Plus className="w-4 h-4 opacity-0 group-hover/item:opacity-40" />
            </button>
          ))}
        </Dropdown>
      </div>
    </div>
  );
}


