import express from 'express';
import { createTherapyGoal, updateGoalProgress,getTherapyGoalById, getAllTherapyGoals, updateTherapyGoal, deleteTherapyGoal } from '../controllers/therapyGoalController.js';
import protect from '../middlewares/authMiddleware.js';
const router = express.Router();
import multer from 'multer';
const upload = multer();
router.post('/',protect,upload.single('attachment'), createTherapyGoal);
router.get('/:id',protect,getTherapyGoalById);// get single details

router.get('/', protect, getAllTherapyGoals); // get goal for login user

router.get('/profile/:id', protect, getAllTherapyGoals); //get  all goals for given id
router.put('/:id',protect,upload.single('attachment'), updateTherapyGoal);
router.delete('/:id?',protect, deleteTherapyGoal); //for many pass  array of ids in body
router.post('/progress/:id',protect, updateGoalProgress);


export default router;
