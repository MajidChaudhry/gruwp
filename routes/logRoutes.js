import express from 'express';
import { 
  createLogEntry, 
  getLogEntries,
  getLogEntryById, 
  updateLogEntryById, 
  deleteLogEntryById, 
  deleteLogEntriesByIds 
} from '../controllers/logEntryController.js';
import  protect  from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';
const router = express.Router();

// Create a new log entry
router.post('/',protect,upload.single('attachment'), createLogEntry);

// Get all log entries of login profile //type is option i.e ?type=announcement
router.get('/',protect, getLogEntries);

// Get log entries by providing id of any profie
router.get('/profile/:id',protect, getLogEntries); //type is option i.e ?type=announcement

// Get a log entry by ID
router.get('/:id',protect, getLogEntryById);

// Update a log entry by ID
router.put('/:id',protect,upload.single('attachment'), updateLogEntryById);

// Delete a log entry by ID
router.delete('/:id',protect, deleteLogEntryById);

// Delete multiple log entries by IDs
router.delete('/',protect, deleteLogEntriesByIds);

export default router;
