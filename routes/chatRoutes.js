import express from 'express';
import {
  createChatRoom,
  getChatRoom,
  getMessages,
  sendMessage,
  deleteMessage,
  setTypingStatus,
  setVoicingStatus,
  getChatRoomByAppointmentId
} from '../controllers/chatController.js';
import upload from '../middlewares/uploadMiddleware.js';
import protect from '../middlewares/authMiddleware.js';
const router = express.Router();

// Create or fetch existing chat room
router.post('/chat-rooms',protect, createChatRoom);

// Fetch all chat rooms for the logged-in user or a specific user ID
// Optional user ID can be provided as a route parameter
// Example: GET /chat-rooms/:id?page=1&limit=10
router.get('/chat-rooms/:id?',protect, getChatRoom); // id is optional
router.get('/chat-rooms/details/:id',protect,  getChatRoomByAppointmentId); // id is optional
// Get messages in a chat room
// Example: GET /chat-rooms/:chatRoomId/messages?page=1&limit=10
router.get('/chat-rooms/:chatRoomId/messages',protect, getMessages);

// Send a message in the chat room
router.post('/chat-rooms/:chatRoomId/messages',protect, upload.single('media'), sendMessage);

// Delete messages based on different conditions
// Example: DELETE /messages/:id
// Optionally, provide an array of IDs in the request body to delete multiple messages
router.delete('/messages/:id?',protect, deleteMessage); // id is optional

// Update typing status
router.post('/chat-rooms/:chatRoomId/typing',protect, setTypingStatus);

// Update voicing status
router.post('/chat-rooms/:chatRoomId/voicing',protect, setVoicingStatus);

export default router;
