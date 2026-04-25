import { useState } from 'react';

import { isSoundEnabled, setSoundEnabled } from '../../lib/engine/notificationSound';
import { vscode } from '../../lib/engine/vscodeApi';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { MenuItem } from '../ui/MenuItem';
import { Modal } from '../ui/Modal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDebugMode: boolean;
  onToggleDebugMode: () => void;
  alwaysShowOverlay: boolean;
  onToggleAlwaysShowOverlay: () => void;
  externalAssetDirectories: string[];
  watchAllSessions: boolean;
  onToggleWatchAllSessions: () => void;
  hooksEnabled: boolean;
  onToggleHooksEnabled: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  isDebugMode,
  onToggleDebugMode,
  alwaysShowOverlay,
  onToggleAlwaysShowOverlay,
  externalAssetDirectories,
  watchAllSessions,
  onToggleWatchAllSessions,
  hooksEnabled,
  onToggleHooksEnabled,
}: SettingsModalProps) {
  const [soundLocal, setSoundLocal] = useState(isSoundEnabled);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SYSTEM SETTINGS">
      <MenuItem
        onClick={() => {
          vscode.postMessage({ type: 'openSessionsFolder' });
          onClose();
        }}
        className="text-[10px] tracking-[0.2em]"
      >
        OPEN SESSIONS REPOSITORY
      </MenuItem>
      <MenuItem
        onClick={() => {
          vscode.postMessage({ type: 'exportLayout' });
          onClose();
        }}
        className="text-[10px] tracking-[0.2em]"
      >
        EXPORT ARCHIVE LAYOUT
      </MenuItem>
      <MenuItem
        onClick={() => {
          vscode.postMessage({ type: 'importLayout' });
          onClose();
        }}
        className="text-[10px] tracking-[0.2em]"
      >
        IMPORT ARCHIVE LAYOUT
      </MenuItem>
      <MenuItem
        onClick={() => {
          vscode.postMessage({ type: 'addExternalAssetDirectory' });
          onClose();
        }}
        className="text-[10px] tracking-[0.2em]"
      >
        ATTACH ASSET DIRECTORY
      </MenuItem>
      
      {externalAssetDirectories.length > 0 && (
        <div className="px-10 py-4 border-b border-border bg-bg-dark/20">
          <div className="text-[9px] uppercase font-bold text-text-muted tracking-[0.2em] mb-4">Attached Assets</div>
          <div className="flex flex-col gap-2">
            {externalAssetDirectories.map((dir) => (
              <div key={dir} className="flex items-center justify-between py-2 gap-8">
                <span
                  className="text-[10px] text-accent font-mono overflow-hidden text-ellipsis whitespace-nowrap opacity-60"
                  title={dir}
                >
                  {dir.split(/[/\\]/).pop()?.toUpperCase() ?? dir.toUpperCase()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => vscode.postMessage({ type: 'removeExternalAssetDirectory', path: dir })}
                  className="w-6 h-6 p-0 text-text-muted hover:text-danger border-none shadow-none"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col py-2">
        <Checkbox
          label="SOUND NOTIFICATIONS"
          checked={soundLocal}
          onChange={() => {
            const newVal = !isSoundEnabled();
            setSoundEnabled(newVal);
            setSoundLocal(newVal);
            vscode.postMessage({ type: 'setSoundEnabled', enabled: newVal });
          }}
          className="text-[10px] tracking-[0.2em]"
        />
        <Checkbox
          label="SYNCHRONIZE ALL SESSIONS"
          checked={watchAllSessions}
          onChange={onToggleWatchAllSessions}
          className="text-[10px] tracking-[0.2em]"
        />
        <Checkbox
          label="INSTANT DETECTION (HOOKS)"
          checked={hooksEnabled}
          onChange={onToggleHooksEnabled}
          className="text-[10px] tracking-[0.2em]"
        />
        <Checkbox
          label="ALWAYS SHOW IDENTIFIERS"
          checked={alwaysShowOverlay}
          onChange={onToggleAlwaysShowOverlay}
          className="text-[10px] tracking-[0.2em]"
        />
        <Checkbox 
          label="DEBUG OVERLAY" 
          checked={isDebugMode} 
          onChange={onToggleDebugMode} 
          className="text-[10px] tracking-[0.2em]"
        />
      </div>
    </Modal>
  );
}
