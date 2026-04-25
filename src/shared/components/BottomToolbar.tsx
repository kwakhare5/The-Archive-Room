import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Dropdown } from '@/shared/components/ui/Dropdown';
import { vscode } from '@/shared/lib/apiBridge';
import type { WorkspaceFolder } from '@/shared/hooks/useExtensionMessages';

interface BottomToolbarProps {
  isEditMode: boolean;
  onOpenClaude: () => void;
  onToggleEditMode: () => void;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  workspaceFolders: WorkspaceFolder[];
  isLocked: boolean;
}

export function BottomToolbar({
  workspaceFolders,
  onToggleSettings,
}: BottomToolbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="absolute bottom-12 right-12 z-50 pointer-events-none">
      <div className="group pointer-events-auto flex flex-row-reverse items-center">
        {/* The Trigger Square (Always Visible) - Solid Dark Obsidian */}
        <div 
          className="w-12 h-12 bg-[#1a140f] border border-white/20 flex items-center justify-center rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,0.2)] cursor-pointer group-hover:bg-[#1a140f]/90 transition-all z-10"
        >
          <span className="text-white/60 font-black text-lg leading-none">+</span>
        </div>

        {/* The Sliding Menu (Revealed on Hover) */}
        <div className="flex items-center gap-2 overflow-hidden max-w-0 group-hover:max-w-md group-hover:pr-3 transition-all duration-500 ease-in-out opacity-0 group-hover:opacity-100">
          <Button
            variant="default"
            onClick={onToggleSettings}
            className="h-10 px-6 bg-[#1a140f] text-white/60 border border-white/10 hover:border-white/40 hover:text-white text-[10px] command-text rounded-sm whitespace-nowrap"
          >
            SETTINGS
          </Button>

          <div className="relative">
            <Button
              variant="default"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="h-10 px-8 bg-[#1a140f] text-white/80 border border-white/10 hover:border-white/40 hover:text-white text-[10px] font-black command-text rounded-sm whitespace-nowrap shadow-xl"
            >
              DISPATCH_AGENT
            </Button>

            <Dropdown isOpen={isDropdownOpen} className="w-56 p-2 bg-[#1a140f] border-2 border-white/10 flex flex-col gap-1 shadow-2xl rounded-sm absolute bottom-full mb-4 right-0">
              <div className="px-3 py-2 text-[9px] text-white/20 uppercase tracking-widest border-b border-white/5 mb-1 font-mono text-center">Archive_Project_Node</div>
              {workspaceFolders.map((folder) => (
                <button
                  key={folder.path}
                  className="w-full text-left p-3 text-[10px] text-white/40 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest font-mono"
                  onClick={() => {
                    vscode.postMessage({ type: 'spawnAgent', folderPath: folder.path, folderName: folder.name });
                    setIsDropdownOpen(false);
                  }}
                >
                  {folder.name}
                </button>
              ))}
            </Dropdown>
          </div>
        </div>
      </div>
    </div>
  );
}


