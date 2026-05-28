import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  
  // Use current host for websocket, or specific env var
  let wsUrl = import.meta.env.VITE_WS_URL;
  if (!wsUrl) {
    if (import.meta.env.VITE_API_URL) {
      const apiObj = new URL(import.meta.env.VITE_API_URL);
      const protocol = apiObj.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${apiObj.host}/ws/updates/`;
    } else {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host; // e.g., localhost or domain.com
      wsUrl = `${wsProtocol}//${host}/ws/updates/`;
    }
  }

  const { latestMessage, isConnected } = useWebSocket(wsUrl, user ? token : null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (latestMessage) {
      setEvents(prev => [...prev, latestMessage].slice(-50)); // Keep last 50 events
    }
  }, [latestMessage]);

  return (
    <WebSocketContext.Provider value={{ latestMessage, isConnected, events }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => useContext(WebSocketContext);
