import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/cryptoUtils.js';

const soapNotesSchema = new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: "TherapistProfile", required: true,},
  patientId: {type: mongoose.Schema.Types.ObjectId,ref: "PatientProfile",required: true,},
  date: { type: Date, required: true },
  startTime: { type: String, required: true, set: encrypt, get: decrypt }, // Encrypt startTime
  endTime: { type: String, required: true, set: encrypt, get: decrypt },   // Encrypt endTime
  subjective: { type: String, required: true, set: encrypt, get: decrypt }, // Encrypt subjective notes
  assessment: { type: String, required: true, set: encrypt, get: decrypt }, // Encrypt assessment notes
  objective: { type: String, required: true, set: encrypt, get: decrypt }   // Encrypt objective observations
}, { 
  timestamps: true,
  toJSON: { getters: true } // Ensure encrypted fields are decrypted when converting to JSON
});

const SOAPNotes = mongoose.model("SOAPNotes", soapNotesSchema);
export default SOAPNotes;
