import express from 'express';
import { createSOAPNotes, getSOAPNotesById, getAllSOAPNotes, updateSOAPNotes, deleteSOAPNotes } from '../controllers/soapNotesController.js';
import protect from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create a SOAP note
router.post('/', protect, createSOAPNotes);

// Get a SOAP note by ID
router.get('/:id', protect, getSOAPNotesById);

// Get all SOAP notes of login profile //have optional pagination
router.get('/', protect, getAllSOAPNotes);

// Get all SOAP notes of give  profile id
router.get('/profile/:id', protect, getAllSOAPNotes);

// Get all SOAP notes with given  appointment //have optional pagination
router.get('/appointment/:appointmentId', protect, getAllSOAPNotes);

// Update a SOAP note
router.put('/:id', protect, updateSOAPNotes);

// Delete SOAP notes (single or multiple)  array of ides for many in body
router.delete('/:id', protect, deleteSOAPNotes);

export default router;
