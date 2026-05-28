import { useEffect, useRef, useState } from 'react';

export const useWebSocket = (url, token) => {
  const [messages, setMessages] = useState([]);
  const [latestMessage, setLatestMessage] = useState(null);
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const connect = () => {
      ws.current = new WebSocket(`${url}?token=${token}`);

      ws.current.onopen = () => {
        console.log('WebSocket Connected');
        setIsConnected(true);
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMessages((prev) => [...prev, data]);
          setLatestMessage(data);
        } catch (err) {
          console.error("Failed to parse websocket message", err);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket Disconnected. Reconnecting...');
        setIsConnected(false);
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.current.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.current.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) {
        ws.current.onclose = null; // Prevent reconnect on unmount
        ws.current.close();
      }
    };
  }, [url, token]);

  const clearMessages = () => setMessages([]);

  return { messages, latestMessage, isConnected, clearMessages };
};
