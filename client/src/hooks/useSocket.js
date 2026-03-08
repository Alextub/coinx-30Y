import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let socketInstance = null;

export function useSocket() {
  const [gameState, setGameState] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    }
    socketRef.current = socketInstance;

    const onState = (state) => setGameState(state);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socketInstance.on('game_state', onState);
    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);

    if (socketInstance.connected) setConnected(true);

    return () => {
      socketInstance.off('game_state', onState);
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
    };
  }, []);

  const emit = (event, data) => {
    if (socketRef.current) socketRef.current.emit(event, data);
  };

  const on = (event, cb) => {
    if (socketRef.current) socketRef.current.on(event, cb);
    return () => { if (socketRef.current) socketRef.current.off(event, cb); };
  };

  return { gameState, connected, emit, on, socket: socketRef.current };
}
