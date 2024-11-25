// controllers/invoiceController.js
import Invoice from '../models/InvoiceModel.js';
import PatientProfile from '../models/PatientProfile.js';
import TherapistProfile from '../models/TherapistProfile.js';
import { createNotification } from './notificationController.js';
import { pusher } from '../config/pusher.js';
// Send Invoice (Therapist to Patient)
export const sendInvoice = async (req, res) => {
  const { patientId, therapistId, invoiceId, title, amount, dueDate, attachment } = req.body;

  try {
    // Verify both patient and therapist exist
    const patient = await PatientProfile.findById(patientId);
    const therapist = await TherapistProfile.findById(therapistId);

    if (!patient || !therapist) {
      return res.status(404).json({ message: 'Patient or Therapist not found' });
    }

    // Create a new invoice
    const newInvoice = new Invoice({
      patientId,
      therapistId,
      invoiceId,
      title,
      amount,
      dueDate,
      attachment,
      status: 'unpaid' // Set default status
    });

    await newInvoice.save();
 // Create notification for the patient
 const notificationMessage = `You have a new invoice titled "${title}" from ${therapist.name}. Amount: $${amount}. Due date: ${dueDate}.`;
 await createNotification(patientId, 'Invoice', notificationMessage, newInvoice._id);

 // Trigger real-time notification via Pusher
 pusher.trigger(`patient-${patientId}`, 'notification', {
   type: 'Invoice',
   message: notificationMessage,
   referenceId: newInvoice._id,
 });
    return res.status(201).json({ message: 'Invoice sent successfully', invoice: newInvoice });
  } catch (error) {
    return res.status(500).json({ message: 'Error sending invoice', error: error.message });
  }
};

// Handle Invoice Payment (Patient)
export const handlePayment = async (req, res) => {
  const { invoiceId, paymentMethod, paymentDate } = req.body;

  try {
    const invoice = await Invoice.findOne({ invoiceId });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Update payment status
    invoice.paymentMethod = paymentMethod;
    invoice.paymentDate = paymentDate;
    invoice.status = 'paid'; // Mark as paid

    await invoice.save();

    // Create notification for the therapist
    const notificationMessage = `Invoice titled "${invoice.title}" has been paid by ${invoice.patientId.name}. Amount: $${invoice.amount}.`;
    await createNotification(invoice.therapistId, 'Invoice', notificationMessage, invoice._id);

    // Trigger real-time notification via Pusher
    pusher.trigger(`therapist-${invoice.therapistId}`, 'notification', {
      type: 'Invoice',
      message: notificationMessage,
      referenceId: invoice._id,
    });

    return res.status(200).json({ message: 'Payment successful', invoice });
  } catch (error) {
    return res.status(500).json({ message: 'Error processing payment', error: error.message });
  }
};

// Get all invoices for a specific patient
export const getInvoicesByPatient = async (req, res) => {
  const { patientId } = req.params;

  try {
    const invoices = await Invoice.find({ patientId });

    return res.status(200).json({ invoices });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching invoices', error: error.message });
  }
};

// Get all invoices for a specific therapist
export const getInvoicesByTherapist = async (req, res) => {
  const { therapistId } = req.params;

  try {
    const invoices = await Invoice.find({ therapistId });

    return res.status(200).json({ invoices });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching invoices', error: error.message });
  }
};
// Delete a specific invoice by invoiceId
export const deleteInvoiceById = async (req, res) => {
    const { invoiceId } = req.params;
  
    try {
      const invoice = await Invoice.findByIdAndDelete(invoiceId);
  
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
  
      return res.status(200).json({ message: 'Invoice deleted successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Error deleting invoice', error: error.message });
    }
  };
  
  // Delete all invoices for a specific patient or therapist
  export const deleteAllInvoicesByUser = async (req, res) => {
    const { userId, userType } = req.params;  // userType will be either 'patient' or 'therapist'
  
    try {
      let result;
      if (userType === 'patient') {
        result = await Invoice.deleteMany({ patientId: userId });
      } else if (userType === 'therapist') {
        result = await Invoice.deleteMany({ therapistId: userId });
      } else {
        return res.status(400).json({ message: 'Invalid user type' });
      }
  
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'No invoices found for the user' });
      }
  
      return res.status(200).json({ message: `${result.deletedCount} invoices deleted successfully` });
    } catch (error) {
      return res.status(500).json({ message: 'Error deleting invoices', error: error.message });
    }
  };