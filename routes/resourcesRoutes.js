import express from 'express';
import {
  createResource,
  getAllResources,
  getResourceById,
  updateResource,
  deleteResource
} from '../controllers/resourcesController.js';
import protect from '../middlewares/authMiddleware.js';
import multer from 'multer';
const upload = multer();
const router = express.Router();

// Resource routes
router.post('/',protect,upload.single('media'), createResource);
router.get('/', protect,getAllResources); 
router.get('/profile/:id', protect,getAllResources);
router.get('/:id',protect, getResourceById);
router.put('/:id',protect,upload.single('media'), updateResource);
router.delete('/:id?',protect, deleteResource);//for many pass  array of ids in body

export default router;
