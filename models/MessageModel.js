import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/cryptoUtils.js';

const messageSchema = new mongoose.Schema({
  chatRoomId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
  senderId: {type: mongoose.Schema.Types.ObjectId, ref: 'User',required: true},
  text: { type: String, set: encrypt, get: decrypt },
  media: { type: String, set: encrypt, get: decrypt },
  type: { type: String, enum: ['text', 'image', 'audio', 'video', 'file'], required: true },
  isRead: { type: Boolean, default: false },

}, {
  toJSON: { getters: true },
  timestamps: true
});

const Message = mongoose.model('Message', messageSchema);
export default Message;
