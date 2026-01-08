import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/auth-store';

const getSocketUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5002';
  }
  const hostname = window.location.hostname;
  const isHttps = window.location.protocol === 'https:';
  const protocol = isHttps ? 'https' : 'http';
  const wsProtocol = isHttps ? 'wss' : 'ws';
  
  if (hostname === 'app.nurtureengine.net') {
    // For WebSocket, use wss:// for HTTPS
    return isHttps ? 'wss://api.nurtureengine.net' : 'ws://api.nurtureengine.net';
  }
  
  const isExternal = hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('.net');
  if (isExternal) {
    return `${wsProtocol}://${hostname}:5002`;
  }
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5002';
  return apiUrl.replace(/^https?:/, isHttps ? 'wss:' : 'ws:');
};

export function usePbxWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken || !user?.id) {
      // Don't try to connect if not authenticated
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = getSocketUrl();
    console.log('Connecting to PBX WebSocket:', `${socketUrl}/pbx`);
    
    const newSocket = io(`${socketUrl}/pbx`, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('PBX WebSocket connected');
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('PBX WebSocket disconnected:', reason);
    });

    newSocket.on('connect_error', (error) => {
      console.error('PBX WebSocket connection error:', error.message);
      setIsConnected(false);
    });

    newSocket.on('call:incoming', (data) => {
      setIncomingCall(data);
    });

    newSocket.on('call:state:changed', (data) => {
      console.log('Call state changed:', data);
    });

    newSocket.on('call:ended', (data) => {
      console.log('Call ended:', data);
      setIncomingCall(null);
    });

    newSocket.on('presence:update', (data) => {
      console.log('Presence update:', data);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, [accessToken, user?.id]);

  const answerCall = useCallback(
    (callId: string) => {
      if (socket) {
        socket.emit('call:answer', { callId });
      }
    },
    [socket],
  );

  const hangupCall = useCallback(
    (callId: string) => {
      if (socket) {
        socket.emit('call:hangup', { callId });
      }
    },
    [socket],
  );

  const dialCall = useCallback(
    (phoneNumber: string, contactId?: string) => {
      if (socket) {
        socket.emit('call:dial', { phoneNumber, contactId });
      }
    },
    [socket],
  );

  const updateStatus = useCallback(
    (status: string) => {
      if (socket) {
        socket.emit('agent:status:change', { status });
      }
    },
    [socket],
  );

  const login = useCallback(
    (extension: string) => {
      if (socket) {
        socket.emit('agent:login', { extension });
      }
    },
    [socket],
  );

  return {
    socket,
    isConnected,
    incomingCall,
    setIncomingCall,
    answerCall,
    hangupCall,
    dialCall,
    updateStatus,
    login,
  };
}

