// routes/notificationRoutes.js
import express from 'express';
import {
  notificationCreateApi,
  getNotificationsByUser,
  markNotificationAsRead,
  deleteNotificationById,
  deleteAllNotificationsByUser
} from '../controllers/notificationController.js';
import  protect  from '../middlewares/authMiddleware.js';
const router = express.Router();

// Route to create a notification
router.post('/',protect, notificationCreateApi);  // Create a notification

// Route to fetch all notifications for a specific user by userId
router.get('/',protect, getNotificationsByUser);  // Get all notifications for a login profile

// Route to mark a specific notification as read
router.patch('/read/:id',protect, markNotificationAsRead);  // Mark notification as read

// Route to delete a specific notification by notificationId
router.delete('/:id',protect, deleteNotificationById);  // Delete a specific notification also accept ?Ids=array of ides for delete

// Route to delete all notifications for a specific user which logined
router.delete('/all',protect, deleteAllNotificationsByUser);  // Delete all notifications for a user

export default router;
