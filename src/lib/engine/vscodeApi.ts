// VS Code API Stub for Standalone Web App
const CONFIG_KEY = 'archive-room-config';

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

function getConfig(): ArchiveRoomConfig {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config: Partial<ArchiveRoomConfig>) {
  const current = getConfig();
  const next = { ...current, ...config };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
}

export const vscode = {
  postMessage: (message: any) => {
    console.log('[VSCode Stub] postMessage:', message);
    
    if (message.type === 'saveLayout') {
      saveConfig({ layout: message.layout });
      
      // Keep background sync for layout files
      fetch('http://localhost:8765/save-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message.layout),
      })
        .then((r) => r.json())
        .then((data) => console.log('Save response:', data))
        .catch((e) => console.error('Save failed:', e));
    } else if (message.type === 'saveAgentSeats') {
      saveConfig({ agentSeats: message.seats });
    } else if (message.type === 'setAlwaysShowLabels') {
      const config = getConfig();
      config.settings.alwaysShowLabels = message.enabled;
      saveConfig(config);
    } else if (message.type === 'setWatchAllSessions') {
      const config = getConfig();
      config.settings.watchAllSessions = message.enabled;
      saveConfig(config);
    } else if (message.type === 'setHooksEnabled') {
      const config = getConfig();
      config.settings.hooksEnabled = message.enabled;
      saveConfig(config);
    }
  },
  getState: () => {
    return getConfig().vscodeState;
  },
  setState: (state: any) => {
    saveConfig({ vscodeState: state });
  },
};
