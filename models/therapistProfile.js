import mongoose from 'mongoose';

import { encrypt, decrypt } from '../utils/cryptoUtils.js';
const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const therapistProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  specializations: { type: String,  },
  qualifications: { type: String, },
  consultationDays: [
    {
      day: String,
      available: { type: Boolean, default: true },
      slots: [
        {
          available: { type: Boolean, default: true },
          start: String,
          end: String,
          bookedDates: { type: [Date], default: [] },
        },
      ],
    },
  ],
  medicalLicenseNumber: { type: String, set: encrypt, get: decrypt },
  yearsExperience: { type: Number, required: true },
  bio: { type: String ,default:""},  // New field for "About Me"
  location: { type: String },
  reviews: {                                 
    type: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      comment: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    }],
    default: []  
  },
  status: {                                      
    type: String,
    enum: ['available', 'unavailable', 'busy', 'on_leave'], // Possible values for status
    default: 'available'                          // Default value
  },
  patients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "PatientProfile",
  }],
  appointments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
  ],
}, {
  toJSON: { getters: true },  
  timestamps: true    
});

const TherapistProfile = mongoose.model('TherapistProfile', therapistProfileSchema);
export default TherapistProfile;

