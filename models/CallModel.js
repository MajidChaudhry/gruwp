import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/cryptoUtils.js';

const callSchema = new mongoose.Schema({
  chatRoomId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
  callerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  callType: { type: String, set: encrypt, get: decrypt },
  startTime: { type: String, set: encrypt, get: decrypt },
  endTime: { type: String, set: encrypt, get: decrypt },
  duration: { type: Number },
  status: { type: String, set: encrypt, get: decrypt }
}, {
  toJSON: { getters: true },
  timestamps: true
});

const Call = mongoose.model('Call', callSchema);
export default Call;
