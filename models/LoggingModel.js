// LoggingModel.js
import mongoose from "mongoose";
import { encrypt, decrypt } from "../utils/cryptoUtils.js"; // Utility functions for encryption/decryption

const LogEntrySchema = new mongoose.Schema(
  {
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TherapistProfile",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientProfile",
      required: true,
    },
    logType: {
      type: String,
      enum: [
        "post",
        "announcement",
        "observation",
        "napping",
        "eating",
        "fluid",
        "diaper",
        "injury",
        "absence",
        "behavior",
        "bottle",
        "illness",
        "medication",
        "supplies",
      ],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    data: {
      type: Object,
      default: {},
      require: true,

    },
    attachment: { type: String, set: encrypt, get: decrypt }
  },
  {
    minimize: false,
    toJSON: { getters: true }, // Include getters when converting to JSON
    toObject: { getters: true }, // Include getters when converting to plain object
  }
);

const LogEntry = mongoose.model("LogEntry", LogEntrySchema);
export default LogEntry;
