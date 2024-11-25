import mongoose from 'mongoose';

const therapyGoalSchema = new mongoose.Schema({
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: "TherapistProfile", required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "PatientProfile", required: true },
  title: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  totalSessions: { type: String, required: true },
  description: { type: String, required: true },
  attachment: { type: String },
  status: {
    type: String,
    enum: ["inprogress", "complete", "uncomplete"],
    default: "inprogress",
  },
  progress: {
    correct: { type: Number, default: 0 },       // Number of correct responses
    incorrect: { type: Number, default: 0 },     // Number of incorrect responses
    percentage: { type: Number, default: 0 }     // Calculated progress percentage
  }

}, { 
  timestamps: true
});

// Middleware to calculate the percentage before saving
therapyGoalSchema.pre('save', function(next) {
  const correct = this.progress.correct || 0;
  const incorrect = this.progress.incorrect || 0;
  const totalAttempts = correct + incorrect;

  // Calculate percentage if there are any attempts
  if (totalAttempts > 0) {
    this.progress.percentage = (correct / totalAttempts) * 100;
  } else {
    this.progress.percentage = 0; // Default to 0 if there are no attempts
  }
  
  next();
});

const TherapyGoal = mongoose.model("TherapyGoal", therapyGoalSchema);
export default TherapyGoal;
