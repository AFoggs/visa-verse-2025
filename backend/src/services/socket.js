import { getDb, getAuth } from '../config/firebase.js';
import { v4 as uuidv4 } from 'uuid';

const connectedUsers = new Map();
const roomUsers = new Map();
const userSockets = new Map(); // Map userId to socket instances for global notifications
const socketMessageCounts = new Map(); // Track message counts per socket for rate limiting
const SOCKET_RATE_LIMIT = 30; // Max messages per window
const SOCKET_RATE_WINDOW = 60000; // 1 minute window

export function setupSocketHandlers(io) {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const userId = socket.handshake.auth.userId;

      if (!token || !userId) {
        return next(new Error('Authentication required'));
      }

      // Verify Firebase token
      const auth = getAuth();
      const decodedToken = await auth.verifyIdToken(token);

      // Verify the userId matches the token
      if (decodedToken.uid !== userId) {
        return next(new Error('User ID mismatch'));
      }

      // Attach verified user to socket
      socket.userId = decodedToken.uid;
      socket.userEmail = decodedToken.email;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId; // Use verified userId from middleware
    console.log(`User connected: ${userId}`);

    // Store user connection
    connectedUsers.set(userId, socket.id);
    userSockets.set(userId, socket);

    // Join user-specific room for global notifications
    socket.on('join_user_room', ({ userId: uid }) => {
      socket.join(`user_${uid}`);
      console.log(`User ${uid} joined their notification room`);
    });

    // Join a chat room
    socket.on('join_room', ({ roomId, userId: uid }) => {
      socket.join(roomId);

      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Set());
      }
      roomUsers.get(roomId).add(uid);

      console.log(`User ${uid} joined room ${roomId}`);
    });

    // Leave a chat room
    socket.on('leave_room', ({ roomId, userId: uid }) => {
      socket.leave(roomId);

      if (roomUsers.has(roomId)) {
        roomUsers.get(roomId).delete(uid);
      }

      console.log(`User ${uid} left room ${roomId}`);
    });

    // Send a message
    socket.on('send_message', async ({ roomId, senderId, content, type }) => {
      // Rate limiting check
      const now = Date.now();
      const socketKey = socket.id;
      const rateData = socketMessageCounts.get(socketKey) || { count: 0, windowStart: now };

      if (now - rateData.windowStart > SOCKET_RATE_WINDOW) {
        // Reset window
        rateData.count = 0;
        rateData.windowStart = now;
      }

      rateData.count++;
      socketMessageCounts.set(socketKey, rateData);

      if (rateData.count > SOCKET_RATE_LIMIT) {
        socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
        return;
      }

      // Validate senderId matches authenticated user
      if (senderId !== socket.userId) {
        socket.emit('error', { message: 'Unauthorized sender' });
        return;
      }

      // Validate content
      if (!content || typeof content !== 'string') {
        socket.emit('error', { message: 'Invalid message content' });
        return;
      }

      // Limit message length
      const MAX_MESSAGE_LENGTH = 5000;
      if (content.length > MAX_MESSAGE_LENGTH) {
        socket.emit('error', { message: 'Message too long' });
        return;
      }

      const message = {
        messageId: uuidv4(),
        senderId,
        content: content.slice(0, MAX_MESSAGE_LENGTH), // Enforce limit
        type: type || 'text',
        timestamp: new Date().toISOString(),
      };

      // Broadcast to room
      io.to(roomId).emit('new_message', {
        roomId,
        ...message,
      });

      // Get sender name and other participant for global notifications
      try {
        const db = getDb();
        const [matchDoc, senderDoc] = await Promise.all([
          db.collection('matches').doc(roomId).get(),
          db.collection('users').doc(senderId).get(),
        ]);

        if (matchDoc.exists) {
          const matchData = matchDoc.data();

          // Verify sender is part of this match
          if (matchData.user1Id !== senderId && matchData.user2Id !== senderId) {
            socket.emit('error', { message: 'Access denied to this room' });
            return;
          }

          const senderName = senderDoc.exists ? senderDoc.data().profile?.name || 'Someone' : 'Someone';

          // Find the other participant
          const otherUserId = matchData.user1Id === senderId ? matchData.user2Id : matchData.user1Id;

          // Emit global notification to the other user
          io.to(`user_${otherUserId}`).emit('global_message', {
            roomId,
            senderId,
            senderName,
            content: content.slice(0, 100), // Truncate for notification
            type: type || 'text',
            timestamp: message.timestamp,
          });
        }
      } catch (notifyError) {
        console.error('Error sending global notification:', notifyError);
      }

      // Save to database with message limit
      try {
        const db = getDb();
        const convDoc = await db.collection('conversations').doc(roomId).get();

        if (convDoc.exists) {
          const currentMessages = convDoc.data().messages || [];
          // Keep only last 500 messages to prevent unbounded growth
          const MAX_MESSAGES = 500;
          const updatedMessages = [...currentMessages, message].slice(-MAX_MESSAGES);

          await db.collection('conversations').doc(roomId).update({
            messages: updatedMessages,
            updatedAt: new Date(),
          });
        } else {
          await db.collection('conversations').doc(roomId).set({
            conversationId: roomId,
            messages: [message],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        console.error('Error saving message:', error);
      }
    });

    // Typing indicators
    socket.on('typing_start', ({ roomId, userId: uid }) => {
      socket.to(roomId).emit('typing_start', { roomId, userId: uid });
    });

    socket.on('typing_stop', ({ roomId, userId: uid }) => {
      socket.to(roomId).emit('typing_stop', { roomId, userId: uid });
    });

    // Voice call signaling
    socket.on('voice_call_offer', ({ roomId, offer, callerId }) => {
      socket.to(roomId).emit('voice_call_offer', { offer, callerId });
    });

    socket.on('voice_call_answer', ({ roomId, answer }) => {
      socket.to(roomId).emit('voice_call_answer', { answer });
    });

    socket.on('voice_ice_candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('voice_ice_candidate', { candidate });
    });

    socket.on('voice_call_end', ({ roomId }) => {
      socket.to(roomId).emit('voice_call_end', {});
    });

    socket.on('voice_call_decline', ({ roomId }) => {
      socket.to(roomId).emit('voice_call_decline', {});
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      connectedUsers.delete(userId);
      userSockets.delete(userId);
      socketMessageCounts.delete(socket.id); // Clean up rate limit data

      // Remove from all rooms
      roomUsers.forEach((users, roomId) => {
        if (users.has(userId)) {
          users.delete(userId);
          socket.to(roomId).emit('user_left', { userId, roomId });
        }
      });
    });
  });
}

export function isUserOnline(userId) {
  return connectedUsers.has(userId);
}

export function getUserSocket(userId) {
  return connectedUsers.get(userId);
}

export default {
  setupSocketHandlers,
  isUserOnline,
  getUserSocket,
};
