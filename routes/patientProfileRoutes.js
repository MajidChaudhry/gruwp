import express from 'express';
import {
  createPatientProfile,
  getPatientProfile,
  updatePatientProfile,
  deletePatientProfile,
  getPatientsByTherapist
} from '../controllers/patientProfileController.js';
import  protect  from '../middlewares/authMiddleware.js'; // Middleware for user authentication
import upload from '../middlewares/uploadMiddleware.js';
const router = express.Router();

router.post('/', protect,upload.single('profilePicture'), createPatientProfile); // Create profile
router.get('/:id?', protect, getPatientProfile);     // Get profile
router.put('/', protect,upload.single('profilePicture'), updatePatientProfile);  // Update profile
router.delete('/', protect, deletePatientProfile); // Delete profile
router.get('/associated/therapist/:id?', protect, getPatientsByTherapist); //get all one therapist patients which is login. also its get all aptient by pass therapist id
export default router;
