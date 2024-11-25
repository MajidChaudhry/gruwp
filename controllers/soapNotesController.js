import SOAPNotes from '../models/SOAPNotesModel.js';
import Appointment from "../models/AppointmentModel.js";
import { createNotification } from './notificationController.js';
import { pusher } from '../config/pusher.js';
// Create SOAP notes
export const createSOAPNotes = async (req, res) => {
  const { appointmentId, patientId,  date, startTime, endTime, subjective, assessment, objective } = req.body;
  const therapistId = req.profileId;
  try {
    const soapNotes = new SOAPNotes({ appointmentId, patientId, therapistId, date, startTime, endTime, subjective, assessment, objective });
    await soapNotes.save();
      // Notify the patient about the new SOAP notes
      const notificationMessage = `New SOAP notes have been added to your record for appointment ID: ${appointmentId}`;
    
      // Save notification in the database
      await createNotification(patientId, 'SOAPNote', notificationMessage, soapNotes._id);
  
      // Trigger real-time notification via Pusher
      pusher.trigger(`patient-${patientId}`, 'notification', {
        type: 'SOAPNote',
        message: notificationMessage,
        referenceId: soapNotes._id,
      });
    return res.status(201).json({ message: 'SOAP Notes created successfully', soapNotes });
  } catch (err) {
    return res.status(500).json({ message: 'Error creating SOAP Notes', error: err.message });
  }
};

// Get a single SOAP note by ID
export const getSOAPNotesById = async (req, res) => {
  try {
    const soapNotes = await SOAPNotes.findById(req.params.id);
    if (!soapNotes) return res.status(404).json({ message: 'SOAP Notes not found' });
    return res.status(200).json(soapNotes);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching SOAP Notes', error: err.message });
  }
};

// Get SOAP notes with optional appointmentId and pagination
export const getAllSOAPNotes = async (req, res) => {
  const { appointmentId } = req.params; // Optional appointmentId parameter
  const profileId = req.params.id||req.profileId; // Logged-in user's profile ID (could be therapist or patient)

  // Optional pagination parameters
  const page = req.query.page ? parseInt(req.query.page) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const skip = page && limit ? (page - 1) * limit : null;

  try {
    let query = {};

    if (appointmentId) {
      // If appointmentId is provided, get SOAP notes for that appointment
      query = { appointmentId };
    } else {
      // If no appointmentId, find all appointments where the user is either the therapist or patient
      const appointments = await Appointment.find({
        $or: [
          { therapistId: profileId }, // Logged-in user is the therapist
          { patientId: profileId }     // Logged-in user is the patient
        ]
      }).select('_id'); // Only select appointment IDs

      // Extract appointment IDs from found appointments
      const appointmentIds = appointments.map(appointment => appointment._id);

      if (!appointmentIds.length) {
        return res.status(404).json({ message: 'No appointments found for this user' });
      }

      // Now fetch SOAP notes related to those appointment IDs
      query = { appointmentId: { $in: appointmentIds } };
    }

    // Fetch SOAP notes with optional pagination
    const soapNotes = await SOAPNotes.find(query)
      .skip(skip)  // Apply skip if pagination is provided
      .limit(limit) // Apply limit if pagination is provided
      .exec();

    // Get the total count for pagination metadata
    const totalSOAPNotes = await SOAPNotes.countDocuments(query);
    const totalPages = limit ? Math.ceil(totalSOAPNotes / limit) : null;

    let response = { soapNotes };

    // Add pagination metadata if page and limit are provided
    if (page && limit) {
      response.currentPage = page;
      response.totalPages = totalPages;
      response.totalSOAPNotes = totalSOAPNotes;
    }

    if (!soapNotes.length) {
      return res.status(200).json({ message: 'No SOAP notes found' });
    }

    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching SOAP notes', error: err.message });
  }
};


// Update SOAP notes
export const updateSOAPNotes = async (req, res) => {
  const  id=req.params.id;
  const updates = req.body;

  try {
     // Check if there are any updates
     if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    // Create an update object using the $set operator
    const updateObject = { $set: {} };
    for (const key in updates) {
      if (updates[key] !== undefined) {
        updateObject.$set[key] = updates[key];
      }
    }
    const soapNotes = await SOAPNotes.findByIdAndUpdate(id, updateObject, { new: true });
    if (!soapNotes) return res.status(404).json({ message: 'SOAP Notes not found' });
    // Notify the patient about the updated SOAP notes
    const notificationMessage = `Your SOAP notes for appointment ID: ${soapNotes.appointmentId} have been updated.`;

    // Save notification in the database
    await createNotification(soapNotes.patientId, 'SOAPNote', notificationMessage, soapNotes._id);

    // Trigger real-time notification via Pusher
    pusher.trigger(`patient-${soapNotes.patientId}`, 'notification', {
      type: 'SOAPNote',
      message: notificationMessage,
      referenceId: soapNotes._id,
    });
    return res.status(200).json({ message: 'SOAP Notes updated successfully', soapNotes });
  } catch (err) {
    return res.status(500).json({ message: 'Error updating SOAP Notes', error: err.message });
  }
};

// Delete SOAP notes (single or multiple)
export const deleteSOAPNotes = async (req, res) => {
  const { id } = req.params; // Single ID
  const { ids } = req.body;  // Array of IDs for multiple deletion

  try {
    // If multiple IDs are provided, delete multiple SOAP notes
    if (ids && ids.length > 0) {
      // Check if all provided ids are valid MongoDB ObjectId
      const isValidIds = ids.every(id => mongoose.Types.ObjectId.isValid(id));
      if (!isValidIds) {
        return res.status(400).json({ message: 'Invalid ID format in request body' });
      }

      const result = await SOAPNotes.deleteMany({ _id: { $in: ids } });

      // Check if any SOAP notes were deleted
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'No SOAP notes found for the provided IDs' });
      }

      return res.status(200).json({ message: 'SOAP Notes deleted successfully', deletedCount: result.deletedCount });
    }

    // If a single ID is provided, delete the single SOAP note
    if (id) {
      // Check if the provided id is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid ID format in request params' });
      }

      const soapNote = await SOAPNotes.findByIdAndDelete(id);

      if (!soapNote) {
        return res.status(404).json({ message: 'SOAP Note not found' });
      }

      return res.status(200).json({ message: 'SOAP Note deleted successfully' });
    }

    // If neither id nor ids are provided, return an error
    return res.status(400).json({ message: 'Please provide a valid ID or an array of IDs for deletion' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting SOAP Notes', error: err.message });
  }
};

