import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/cryptoUtils.js';  // Utility functions for encryption/decryption

const appointmentSchema = new mongoose.Schema({
  therapistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TherapistProfile",
    required: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PatientProfile",
    required: true,
  },
  childDetails: {
    name: { 
      type: String, 
      required: true, 
      set: encrypt, 
      get: decrypt // Encrypt and decrypt child’s name
    },
    gender: { 
      type: String, 
      enum: ["male", "female", "other"], 
      required: true 
    },
    age: { 
      type: Number, 
      required: true 
    },
    problem: { 
      type: String, 
      required: true, 
      set: encrypt, 
      get: decrypt // Encrypt and decrypt the child's problem
    },
  },
  appointmentType: {
    type: String, 
    required: true, 
    set: encrypt, 
    get: decrypt // Encrypt and decrypt appointment time
  },
  appointmentDate: {
    type: Date,
    required: true,
  },
  appointmentTime: {
    type: String, 
    required: true, 
    set: encrypt, 
    get: decrypt // Encrypt and decrypt appointment time
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "authorized", "captured", "refunded", "failed"],
    default: "pending", // Default payment status
  },
  packageType: {
    type: String,
    enum: ["onsite", "video call", "audio call", "message"],
    required: true,
  },
  status: {
    type: String,
    enum: ["requested","scheduled","rescheduled", "confirmed", "completed", "canceled"],
    default: "requested",

  },
  duration: {
    type: Number,
  },
  notes: {
    type: String,
    set: encrypt, 
    get: decrypt,  
    default: "", 
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  toJSON: { getters: true },  // Apply getters when converting the document to JSON
  timestamps: true,           // Automatically handle createdAt and updatedAt
});

// Automatically update the `updatedAt` field before saving
appointmentSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
