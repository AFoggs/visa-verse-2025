import { getDb } from '../config/firebase.js';
import { v4 as uuidv4 } from 'uuid';

const connectedUsers = new Map();
const roomUsers = new Map();

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId;
    console.log(`User connected: ${userId}`);

    // Store user connection
    connectedUsers.set(userId, socket.id);

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
