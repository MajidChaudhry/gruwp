// routes/invoiceRoutes.js
import express from 'express';
import {
  sendInvoice,
  handlePayment,
  getInvoicesByPatient,
  getInvoicesByTherapist,
  deleteInvoiceById,
  deleteAllInvoicesByUser
} from '../controllers/invoiceController.js';
import  protect  from '../middlewares/authMiddleware.js';
const router = express.Router();

// Route to send an invoice (Therapist -> Patient)
router.post('/send',protect, sendInvoice);  // Therapist sends invoice to patient

// Route to handle payment for an invoice (Patient -> Invoice)
router.post('/pay',protect, handlePayment);  // Patient pays for an invoice

// Route to fetch all invoices for a specific patient by patientId
router.get('/patient/:patientId',protect, getInvoicesByPatient);  // Get all invoices for a patient

// Route to fetch all invoices for a specific therapist by therapistId
router.get('/therapist/:therapistId',protect, getInvoicesByTherapist);  // Get all invoices for a therapist

// Route to delete a specific invoice by invoiceId
router.delete('/:invoiceId',protect, deleteInvoiceById);  // Delete a specific invoice

// Route to delete all invoices for a specific user (either patient or therapist)
router.delete('/all/:userType/:userId',protect, deleteAllInvoicesByUser);  // Delete all invoices for a patient or therapist (userType: 'patient' or 'therapist')

export default router;
