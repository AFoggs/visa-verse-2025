import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Get auth token and connect to socket server
    const connectSocket = async () => {
      try {
        const token = await user.getIdToken();

        const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
          auth: {
            userId: user.uid,
            token: token,
          },
          transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
          console.log('Socket connected');
          setConnected(true);
          // Join user-specific room for global notifications
          newSocket.emit('join_user_room', { userId: user.uid });
        });

        newSocket.on('disconnect', () => {
          console.log('Socket disconnected');
          setConnected(false);
        });

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error.message);
          setConnected(false);
        });

        newSocket.on('error', (error) => {
          console.error('Socket error:', error.message);
        });

        setSocket(newSocket);
      } catch (error) {
        console.error('Failed to get auth token for socket:', error);
      }
    };

    connectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user]);

  // Join a chat room
  function joinRoom(roomId) {
    if (socket && connected) {
      socket.emit('join_room', { roomId, userId: user?.uid });
    }
  }

  // Leave a chat room
  function leaveRoom(roomId) {
    if (socket && connected) {
      socket.emit('leave_room', { roomId, userId: user?.uid });
    }
  }

  // Send a message
  function sendMessage(roomId, message) {
    if (socket && connected) {
      socket.emit('send_message', {
        roomId,
        senderId: user?.uid,
        content: message.content,
        type: message.type || 'text',
      });
    }
  }

  // Typing indicator
  function startTyping(roomId) {
    if (socket && connected) {
      socket.emit('typing_start', { roomId, userId: user?.uid });
    }
  }

  function stopTyping(roomId) {
    if (socket && connected) {
      socket.emit('typing_stop', { roomId, userId: user?.uid });
    }
  }

  const value = {
    socket,
    connected,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
