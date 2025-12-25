import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const [unreadCounts, setUnreadCounts] = useState({});
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [currentChatId, setCurrentChatId] = useState(null);

  // Load unread counts from localStorage on mount
  useEffect(() => {
    if (user?.uid) {
      const stored = localStorage.getItem(`unread_${user.uid}`);
      if (stored) {
        try {
          setUnreadCounts(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse stored unread counts:', e);
        }
      }
    }
  }, [user?.uid]);

  // Save unread counts to localStorage when they change
  useEffect(() => {
    if (user?.uid) {
      // Always save, even when empty (to clear old notifications)
      localStorage.setItem(`unread_${user.uid}`, JSON.stringify(unreadCounts));
    }
  }, [unreadCounts, user?.uid]);

  // Check notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // Show browser notification
  const showNotification = useCallback((title, options = {}) => {
    if (permissionStatus !== 'granted') return;
    if (document.visibilityState === 'visible' && options.matchId === currentChatId) return;

    try {
      const notification = new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: options.matchId || 'default',
        renotify: true,
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        if (options.matchId) {
          window.location.href = `/chat/${options.matchId}`;
        }
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [permissionStatus, currentChatId]);

  // Handle incoming messages from socket
  useEffect(() => {
    if (!socket || !connected) return;

    const handleGlobalMessage = (data) => {
      const { roomId, senderId, senderName, content } = data;

      // Don't notify for own messages
      if (senderId === user?.uid) return;

      // Don't increment if currently viewing this chat
      if (roomId === currentChatId) return;

      // Increment unread count
      setUnreadCounts((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] || 0) + 1,
      }));

      // Show browser notification
      showNotification(`New message from ${senderName || 'Someone'}`, {
        body: content?.length > 50 ? content.substring(0, 50) + '...' : content,
        matchId: roomId,
      });

      // Play notification sound if available
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore if audio can't play
      } catch (e) {
        // Ignore audio errors
      }
    };

    socket.on('global_message', handleGlobalMessage);

    return () => {
      socket.off('global_message', handleGlobalMessage);
    };
  }, [socket, connected, user?.uid, currentChatId, showNotification]);

  // Mark messages as read for a specific chat
  const markAsRead = useCallback((matchId) => {
    setUnreadCounts((prev) => {
      const newCounts = { ...prev };
      delete newCounts[matchId];
      return newCounts;
    });
  }, []);

  // Set current active chat (to prevent notifications for visible chat)
  const setActiveChat = useCallback((matchId) => {
    setCurrentChatId(matchId);
    if (matchId) {
      markAsRead(matchId);
    }
  }, [markAsRead]);

  // Clear current chat when leaving
  const clearActiveChat = useCallback(() => {
    setCurrentChatId(null);
  }, []);

  // Get total unread count
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  // Get unread count for specific chat
  const getUnreadCount = useCallback((matchId) => {
    return unreadCounts[matchId] || 0;
  }, [unreadCounts]);

  const value = {
    unreadCounts,
    totalUnread,
    getUnreadCount,
    markAsRead,
    setActiveChat,
    clearActiveChat,
    requestPermission,
    permissionStatus,
    showNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
