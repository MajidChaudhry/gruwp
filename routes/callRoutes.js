import express from 'express';
import {startCallNotification} from '../controllers/callController.js';

import protect from '../middlewares/authMiddleware.js';
const router = express.Router();

// Authentication Routes
router.post('/call-notification',protect, startCallNotification);

export default router;