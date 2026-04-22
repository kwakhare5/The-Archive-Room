import { useEffect, useRef, useCallback } from 'react';

export interface WSMessage {
  type: string;
  [key: string]: any;
}

export const useWebSocket = (url: string, onMessage: (msg: WSMessage) => void) => {
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const socket = new WebSocket(url);

    socket.onopen = () => {
      console.log('WebSocket Connected');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket Disconnected. Reconnecting in 3s...');
      setTimeout(connect, 3000);
    };

    socket.onerror = (err) => {
      console.error('WebSocket Error:', err);
    };

    socketRef.current = socket;
  }, [url, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((msg: WSMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { sendMessage };
};
