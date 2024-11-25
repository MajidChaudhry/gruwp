import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { encrypt, decrypt } from "../utils/cryptoUtils.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, 
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: "PatientProfile" || "TherapistProfile" },
    phoneNumber: {
      type: String,
      required: true,
      set: encrypt,
      get: decrypt,
     
    },
    email: {
      type: String,
      required: true,
      unique: true,
      set: encrypt,
      get: decrypt,
     
    },
    password: {
      type: String,
      required: true,
      
    },
    socialLogins: [{ provider: String, providerId: String }],
    profilePicture: String, 
    role: { type: String, required: true },
    deviceId: { type: String },
      // OTP fields
    resetOtp: String,
    otpVerified: { type: Boolean},
    resetOtpExpires: Date,
    
  },
  {
    toJSON: { getters: true },   // Use getters when converting the document to JSON
    timestamps: true  ,           // Enable timestamps for createdAt and updatedAt // To apply decryption on fields automatically when returning the data
  }
);

// Hash the password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model("User", userSchema);
export default User;