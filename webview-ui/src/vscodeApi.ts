import { isBrowserRuntime } from './runtime';

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

export const vscode: { postMessage(msg: any): void } = isBrowserRuntime
  ? {
      postMessage: (msg: any) => {
        console.log('[vscode.postMessage]', msg);
        if (msg.type === 'saveLayout') {
          localStorage.setItem('office-layout', JSON.stringify(msg.layout));
        } else if (msg.type === 'setSoundEnabled') {
          localStorage.setItem('office-sound-enabled', JSON.stringify(msg.enabled));
        } else if (msg.type === 'setAlwaysShowLabels') {
          localStorage.setItem('office-always-show-labels', JSON.stringify(msg.enabled));
        } else if (msg.type === 'setWatchAllSessions') {
          localStorage.setItem('office-watch-all-sessions', JSON.stringify(msg.enabled));
        }
      },
    }
  : (acquireVsCodeApi() as { postMessage(msg: unknown): void });
