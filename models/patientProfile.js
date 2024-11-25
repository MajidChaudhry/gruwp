import mongoose from 'mongoose';

import { encrypt, decrypt } from '../utils/cryptoUtils.js';

const patientProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true ,unique: true},
  dateOfBirth: { type: String, required: true, set: encrypt, get: decrypt },
  gender: { type: String, required: true },
  address: { type: String, set: encrypt, get: decrypt },
  medicalConditions: { type: String, set: encrypt, get: decrypt },
  medications: { type: String, set: encrypt, get: decrypt },
  emergencyContact: { type: String, set: encrypt, get: decrypt },
  medicalHistory: { type: String, set: encrypt, get: decrypt },
  bloodType: { type: String, set: encrypt, get: decrypt },
  guardianContact: { type: String, set: encrypt, get: decrypt },
  appointmentType:{ type: String, set: encrypt, get: decrypt },
  appointments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
  ],
  therapists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "TherapistProfile",
  }]
}, {
  toJSON: { getters: true },   // Use getters when converting the document to JSON
  timestamps: true             // Enable timestamps for createdAt and updatedAt
});

const PatientProfile = mongoose.model('PatientProfile', patientProfileSchema);
export default PatientProfile;
