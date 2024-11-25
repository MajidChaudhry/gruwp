import express from 'express';
import {
  createTherapistProfile,
  getTherapistProfile,
  getAllTherapists,
  updateTherapistProfile,
  deleteTherapistProfile,
  getTherapistsForPatient,
  addReview,searchTherapists,
  getTherapistProfileWithOutAuth
} from '../controllers/therapistProfileController.js';
import protect from '../middlewares/authMiddleware.js'; // Middleware for user authentication
import upload from '../middlewares/uploadMiddleware.js';
const router = express.Router();

router.get('/search', searchTherapists);
router.post('/review', protect, addReview); //addreview
router.post('/', protect,upload.single('profilePicture'), createTherapistProfile); // Create profile
router.get('/:id?', protect, getTherapistProfile);     // Get profile of login user or by provide id here id is optional we can access any use profile by id
router.put('/', protect,upload.single('profilePicture'), updateTherapistProfile);  // Update profile
router.get('/details/:id', getTherapistProfileWithOutAuth); //without auth
router.delete('/', protect, deleteTherapistProfile); // Delete profile
router.get('/associated/patient/:id?', protect, getTherapistsForPatient); //give all therapist belong to that login patient aur sended id as optional fo specific patient
router.get('/list/all/', getAllTherapists); //give all therapist


export default router;
