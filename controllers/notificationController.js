// controllers/notificationController.js
import Notification from '../models/NotificationModel.js';

// Create a notification function
export const createNotification = async (userId, type, message, referenceId) => {
 

  try {
    const notification = new Notification({
      userId,
      referenceId,   // Could be an invoice, appointment, etc.
      type,          // e.g., 'Invoice', 'Appointment', etc.
      message,       // The notification message
      status: 'unread'
    });

    await notification.save();

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw new Error('Notification creation failed');
  }
};

// Create a notification by api
export const notificationCreateApi = async (req, res) => {
  const { userId, referenceId, type, message } = req.body;

  try {
    const notification = new Notification({
      userId,
      referenceId,   // Could be an invoice, appointment, etc.
      type,          // e.g., 'Invoice', 'Appointment', etc.
      message,       // The notification message
      status: 'unread'
    });

    await notification.save();

    return res.status(201).json({ message: 'Notification created successfully', notification });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating notification', error: error.message });
  }
};

// Fetch notifications for a specific user with optional pagination
export const getNotificationsByUser = async (req, res) => {
  const userId = req.profileId;

  // Optional pagination parameters
  const page = req.query.page ? parseInt(req.query.page) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const skip = page && limit ? (page - 1) * limit : null;

  try {
    // Build the base query
    let notificationsQuery = Notification.find({ userId }).sort({ date: -1 }); // Sort by most recent first

    // Apply pagination if page and limit are provided
    if (skip !== null && limit !== null) {
      notificationsQuery = notificationsQuery.skip(skip).limit(limit);
    }

    // Execute the query
    const notifications = await notificationsQuery.exec();

    // Get total count of notifications for pagination metadata
    const totalNotifications = await Notification.countDocuments({ userId });

    // Response with notifications and pagination info (if applicable)
    const response = {
      notifications,
    };

    if (page && limit) {
      response.currentPage = page;
      response.totalPages = Math.ceil(totalNotifications / limit);
      response.totalNotifications = totalNotifications;
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};


// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  const { id } = req.params;

  try {
    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.status = 'read';

    await notification.save();

    return res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (error) {
    return res.status(500).json({ message: 'Error marking notification as read', error: error.message });
  }
};

// Delete a specific notification by id or multiple by array of ids
export const deleteNotificationById = async (req, res) => {
  const { id } = req.params; // Single ID
  const { ids } = req.body;  // Array of IDs for multiple deletion

  try {
    let result;

    if (ids && ids.length > 0) {
      // Delete multiple notifications using an array of IDs
      result = await Notification.deleteMany({ _id: { $in: ids } });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'No notifications found to delete' });
      }

      return res.status(200).json({ message: `${result.deletedCount} notifications deleted successfully` });
    } else if (id) {
      // Delete a single notification by ID
      const notification = await Notification.findByIdAndDelete(id);

      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      return res.status(200).json({ message: 'Notification deleted successfully' });
    } else {
      return res.status(400).json({ message: 'No notification ID(s) provided' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting notification(s)', error: error.message });
  }
};


// Delete all notifications for a specific user
export const deleteAllNotificationsByUser = async (req, res) => {
  const { id } = req.profileId;

  try {
    const result = await Notification.deleteMany({ id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No notifications found for the user' });
    }

    return res.status(200).json({ message: `${result.deletedCount} notifications deleted successfully` });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting notifications', error: error.message });
  }
};
// Delete all notifications function
export const deleteAllNotifications = async (id) => {
  

  try {
    const result = await Notification.deleteMany({ id });

    if (result.deletedCount === 0) {
      return { message: 'No notifications found for the user' };
    }
    
    return { message: `${result.deletedCount} notifications deleted successfully` };
  } catch (error) {
    return { message: 'Error deleting notifications', error: error.message };
  }
};
