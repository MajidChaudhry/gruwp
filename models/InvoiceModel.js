import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "PatientProfile", required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: "TherapistProfile", required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
  amount: { type: Number, required: true },
  currency: { type: String, default: "USD" },  // Adjust currency as required
  status: { 
    type: String, 
    enum: ["authorized", "captured", "refunded", "failed"], 
    default: "authorized" 
  },
  transactionReference: { type: String, required: true, unique: true },  // Reference from payment gateway
  type: { 
    type: String, 
    enum: ["appointment", "custom_bill"], 
    required: true 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
