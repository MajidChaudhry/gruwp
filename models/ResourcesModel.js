import mongoose from 'mongoose';

const resourcesSchema = new mongoose.Schema({
  // Array of patient IDs: Optional (if empty, resource is for all patients)
  patientIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PatientProfile' 
  }],
  
  // Therapist ID: Required field
  therapistId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "TherapistProfile", 
    required: true 
  },
  
  // Date of resource creation: Required field
  date: { 
    type: Date, default: Date.now 
  },
  
  // Type of resource (article, video, document): Required field
  type: { 
    type: String, 
    enum: ['article', 'video', 'document'], 
    required: true 
  },
  
  // Title of the resource: Required field
  title: { 
    type: String, 
    required: true 
  },
  
  // Details or description of the resource: Optional field
  details: { 
    type: String 
  },
  
  // Therapy type: Required field
  therapyType: { 
    type: String, 
    required: true 
  },

  media: String, 
},{   
    timestamps: true  ,           // Enable timestamps for createdAt and updatedAt // To apply decryption on fields automatically when returning the data
});

// Define the Resources model
const Resources = mongoose.model('Resources', resourcesSchema);

export default Resources;
