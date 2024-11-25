//NotificationModel.js
import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/cryptoUtils.js';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: { type: String, required: true },
  message: { type: String, required: true, set: encrypt, get: decrypt },  // Encrypt message
  date: { type: Date, default: Date.now },
  status: { type: String, default: "unread"} // e.g., "read", "unread"
}, {
  toJSON: { getters: true },  // Enable getters for encrypted fields when converting to JSON
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
