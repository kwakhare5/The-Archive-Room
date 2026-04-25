import { LOCAL_STORAGE_KEY, SAVE_LAYOUT_ENDPOINT } from '@/shared/constants/config';

/**
 * API Bridge for Standalone Web App
 * Replaces the VS Code Extension API by syncing with localStorage
 * and a local FastAPI persistence backend.
 */

interface ArchiveRoomConfig {
  layout: any;
  agentSeats: Record<number, any>;
  settings: {
    soundEnabled: boolean;
    alwaysShowLabels: boolean;
    watchAllSessions: boolean;
    hooksEnabled: boolean;
  };
  vscodeState: any;
}

const DEFAULT_CONFIG: ArchiveRoomConfig = {
  layout: null,
  agentSeats: {},
  settings: {
    soundEnabled: false,
    alwaysShowLabels: false,
    watchAllSessions: false,
    hooksEnabled: true,
  },
  vscodeState: {},
};

function getLocalConfig(): ArchiveRoomConfig {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveLocalConfig(config: Partial<ArchiveRoomConfig>) {
  const current = getLocalConfig();
  const next = { ...current, ...config };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
}

export const vscode = {
  postMessage: (message: any) => {
    if (message.type === 'saveLayout') {
      saveLocalConfig({ layout: message.layout });
      
      // Background sync to local filesystem via FastAPI
      fetch(SAVE_LAYOUT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message.layout),
      })
        .then((r) => r.json())
        .catch((e) => console.error('[API Bridge] Layout sync failed:', e));
    } else if (message.type === 'saveAgentSeats') {
      saveLocalConfig({ agentSeats: message.seats });
    } else if (message.type === 'setAlwaysShowLabels') {
      const config = getLocalConfig();
      config.settings.alwaysShowLabels = message.enabled;
      saveLocalConfig(config);
    } else if (message.type === 'setWatchAllSessions') {
      const config = getLocalConfig();
      config.settings.watchAllSessions = message.enabled;
      saveLocalConfig(config);
    } else if (message.type === 'setHooksEnabled') {
      const config = getLocalConfig();
      config.settings.hooksEnabled = message.enabled;
      saveLocalConfig(config);
    }
  },
  getState: () => {
    return getLocalConfig().vscodeState;
  },
  setState: (state: any) => {
    saveLocalConfig({ vscodeState: state });
  },
};
