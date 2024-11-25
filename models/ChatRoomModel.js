import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/cryptoUtils.js';
const chatRoomSchema = new mongoose.Schema({
  appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Appointment" }],
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProfile', required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapistProfile', required: true },
  messagesId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  callsId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Call' }],
  sessionName: { type: String }, // e.g., "patientId-therapistId"
  sessionPassword: { type: String }, // unique
  
  lastMessage: { type: String , set: encrypt, get: decrypt ,default:"" }
}, {  toJSON: { getters: true },
timestamps: true });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
export default ChatRoom;
