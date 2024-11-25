import LogEntry from '../models/LoggingModel.js';
import { createNotification } from './notificationController.js';
import { pusher } from '../config/pusher.js';
import { encrypt, decrypt } from "../utils/cryptoUtils.js";

import { uploadToBlob, deleteFileFromBlob } from "../utils/azureBlobUtils.js";
function encryptObjectValues(obj) {
  const encryptedObject = {};
  for (const [key, value] of Object.entries(obj)) {
    encryptedObject[key] = encrypt(JSON.stringify(value));
  }
  return encryptedObject;
}

// Helper function to decrypt object values
function decryptObjectValues(obj) {
  const decryptedObject = {};
  for (const [key, value] of Object.entries(obj)) {
    try {
      decryptedObject[key] = JSON.parse(decrypt(value));
    } catch (error) {
      decryptedObject[key] = null; // Handle any decryption errors gracefully
    }
  }
  return decryptedObject;
}


export const createLogEntry = async (req, res) => {
  try {
    const { patientId, logType, data } = req.body;
    const therapistId = req.profileId;

    if (!patientId || !therapistId || !logType || !data) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Encrypt the `data` object
    const encryptedData = encryptObjectValues(data);

    let attachmentUrl = null;
    if (req.file) {
      // Upload file to Azure Blob and get URL
      attachmentUrl = await uploadToBlob(req.file);
    }

    const newLogEntry = new LogEntry({
      therapistId,
      patientId,
      logType,
      data: encryptedData,
      attachment: attachmentUrl,
    });

    await newLogEntry.save();

    // Notification and response logic
    const notificationMessage = `A new log entry has been added to your account. Log type: ${logType}`;
    await createNotification(patientId, 'log', notificationMessage, newLogEntry._id);
    pusher.trigger(`patient-${patientId}`, 'notification', { type: 'log', message: notificationMessage, referenceId: newLogEntry._id });

    const decryptedData = decryptObjectValues(newLogEntry.data);
    res.status(201).json({ message: "Log entry created successfully", logEntry: { ...newLogEntry.toObject(), data: decryptedData } });

  } catch (err) {
    return res.status(500).json({ message: 'Error creating log entry', error: err.message });
  }
};

export const updateLogEntryById = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const updateObject = { $set: {} };
    for (const key in updates) {
      if (updates[key] !== undefined) {
        updateObject.$set[key] = updates[key];
      }
    }

    if (req.file) {
      const newAttachmentUrl = await uploadToBlob(req.file);
      updateObject.$set.attachment = newAttachmentUrl;

      const currentLogEntry = await LogEntry.findById(id);
      if (currentLogEntry.attachment) {
        await deleteFileFromBlob(currentLogEntry.attachment);
      }
    }

    const updatedLogEntry = await LogEntry.findByIdAndUpdate(id, updateObject, { new: true });
    if (!updatedLogEntry) {
      return res.status(404).json({ message: 'Log entry not found' });
    }

    const decryptedData = decryptObjectValues(updatedLogEntry.data);
    const notificationMessage = `Your log entry has been updated. Log type: ${updatedLogEntry.logType}`;
    await createNotification(updatedLogEntry.patientId, 'log', notificationMessage, updatedLogEntry._id);
    pusher.trigger(`patient-${updatedLogEntry.patientId}`, 'notification', { type: 'log', message: notificationMessage, referenceId: updatedLogEntry._id });

    res.status(200).json({ message: 'Log entry updated successfully', logEntry: { ...updatedLogEntry.toObject(), data: decryptedData } });

  } catch (err) {
    return res.status(500).json({ message: 'Error updating log entry', error: err.message });
  }
};

export const getLogEntries = async (req, res) => {
  const id = req.params.id || req.profileId; // Use the passed ID or logged-in user's ID
  const logType = req.query.type; // Log type (if provided) as query parameter

  // Optional pagination parameters
  const page = req.query.page ? parseInt(req.query.page) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const skip = page && limit ? (page - 1) * limit : null;

  try {
    // Build query for fetching log entries
    const query = {};

    // Filter by ID (either patient/therapist ID or user ID)
    if (id) {
      query.$or = [{ therapistId: id }, { patientId: id }];
    }

    // Filter by log type if provided
    if (logType) {
      query.logType = logType;
    }

    // Fetch log entries with optional pagination
    let logEntriesQuery = LogEntry.find(query)
      .sort({ createdAt: -1 }); // Sort by most recent logs

    if (skip !== null && limit !== null) {
      logEntriesQuery = logEntriesQuery.skip(skip).limit(limit);
    }

    // Execute the query
    const logEntries = await logEntriesQuery.exec();

    if (!logEntries || logEntries.length === 0) {
      return res.status(404).json({
        message: logType ? `No log entries found for type: ${logType}` : "No log entries found",
      });
    }

    // Decrypt each log entry's data
    const decryptedLogEntries = logEntries.map(logEntry => ({
      ...logEntry.toObject(),
      data: decryptObjectValues(logEntry.data), // Decrypt data field
    }));

    // If pagination is used, get the total count for pagination metadata
    let totalCount = 0;
    if (page && limit) {
      totalCount = await LogEntry.countDocuments(query);
    }

    // Response with or without pagination metadata
    const response = {
      logEntries: decryptedLogEntries,
    };

    if (page && limit) {
      response.currentPage = page;
      response.totalPages = Math.ceil(totalCount / limit);
      response.totalLogEntries = totalCount;
    }

    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({
      message: "Error fetching log entries",
      error: err.message,
    });
  }
};

// Get a single log entry by ID
export const getLogEntryById = async (req, res) => {
  const { id } = req.params;

  try {
    const logEntry = await LogEntry.findById(id);
    if (!logEntry) {
      return res.status(404).json({ message: 'Log entry not found' });
    }
    
    // Decrypt the data field
    const decryptedData = decryptObjectValues(logEntry.data);
    
    return res.status(200).json({ logEntry: { ...logEntry.toObject(), data: decryptedData } });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching log entry', error: err.message });
  }
};





// Delete a log entry by ID
export const deleteLogEntryById = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedLogEntry = await LogEntry.findByIdAndDelete(id);
    if (!deletedLogEntry) {
      return res.status(404).json({ message: 'Log entry not found' });
    }
    return res.status(200).json({ message: 'Log entry deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting log entry', error: err.message });
  }
};

// Delete multiple log entries by an array of IDs
export const deleteLogEntriesByIds = async (req, res) => {
  const { ids } = req.body; // expects an array of IDs

  try {
    const result = await LogEntry.deleteMany({ _id: { $in: ids } });
    return res.status(200).json({ message: `${result.deletedCount} log entries deleted successfully` });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting log entries', error: err.message });
  }
};

// Function to delete all related records for a given ID (patient or therapist)
export const deleteRecordsById = async (id) => {
  if (!id) {
    throw new Error("ID is required to delete records");
  }

  try {
    // Build the query to find records associated with the given ID
    const query = {
      $or: [{ therapistId: id }, { patientId: id }],
    };

    // Delete all matching records
    const result = await LogEntry.deleteMany(query);

    if (result.deletedCount === 0) {
      return `No records found to delete for ID: ${id}`;
    }

    // Return success message with the count of deleted records
    return `Successfully deleted ${result.deletedCount} records for ID: ${id}`;
  } catch (err) {
    throw new Error(`Error deleting records: ${err.message}`);
  }
};
