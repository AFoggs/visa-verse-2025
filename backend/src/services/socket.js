import { getDb } from '../config/firebase.js';
import { v4 as uuidv4 } from 'uuid';

const connectedUsers = new Map();
const roomUsers = new Map();
const userSockets = new Map(); // Map userId to socket instances for global notifications

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId;
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
      const message = {
        messageId: uuidv4(),
        senderId,
        content,
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
          const senderName = senderDoc.exists ? senderDoc.data().profile?.name || 'Someone' : 'Someone';

          // Find the other participant
          const otherUserId = matchData.user1Id === senderId ? matchData.user2Id : matchData.user1Id;

          // Emit global notification to the other user
          io.to(`user_${otherUserId}`).emit('global_message', {
            roomId,
            senderId,
            senderName,
            content,
            type: type || 'text',
            timestamp: message.timestamp,
          });
        }
      } catch (notifyError) {
        console.error('Error sending global notification:', notifyError);
      }

      // Save to database
      try {
        const db = getDb();
        await db.collection('conversations').doc(roomId).update({
          messages: require('firebase-admin').firestore.FieldValue.arrayUnion(message),
          updatedAt: new Date(),
        });
      } catch (error) {
        // If conversation doesn't exist, create it
        try {
          const db = getDb();
          await db.collection('conversations').doc(roomId).set({
            conversationId: roomId,
            messages: [message],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } catch (createError) {
          console.error('Error saving message:', createError);
        }
      }
    });

    // Typing indicators
    socket.on('typing_start', ({ roomId, userId: uid }) => {
      socket.to(roomId).emit('typing_start', { roomId, userId: uid });
    });

    socket.on('typing_stop', ({ roomId, userId: uid }) => {
      socket.to(roomId).emit('typing_stop', { roomId, userId: uid });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      connectedUsers.delete(userId);
      userSockets.delete(userId);

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
