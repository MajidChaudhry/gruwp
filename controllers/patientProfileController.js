import PatientProfile from "../models/PatientProfile.js";
import Appointment from "../models/AppointmentModel.js";
import User from "../models/UserModel.js";
import { generateAccessToken } from "../utils/tokenUtils.js";
import deleteUserData from "./UserCleanupController.js";

import { uploadToBlob, deleteFileFromBlob } from "../utils/azureBlobUtils.js";
// Fetch patients by therapist with optional pagination
export const getPatientsByTherapist = async (req, res) => {
  const therapistId = req.params.id || req.profileId; // Assuming the therapist ID is from the authenticated user's token

  // Optional pagination parameters
  const page = req.query.page ? parseInt(req.query.page) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const skip = page && limit ? (page - 1) * limit : null;

  try {
    // Find all appointments for the therapist and populate patientId
    const appointments = await Appointment.find({ therapistId }).populate(
      "patientId"
    );

    if (!appointments.length) {
      return res
        .status(404)
        .json({ message: "No patients found for this therapist" });
    }

    // Filter out appointments with null patientId
    const validAppointments = appointments.filter(
      (appointment) => appointment.patientId
    );

    // Extract patientIds from valid appointments
    const patientIds = validAppointments.map(
      (appointment) => appointment.patientId._id
    );

    // Remove duplicates using Set
    const uniquePatientIds = [...new Set(patientIds)];

    // Build the query for fetching patients
    let patientsQuery = PatientProfile.find({
      _id: { $in: uniquePatientIds },
    }).populate({
      path: "userId",
      select: "name email profilePicture",
    });

    // Apply pagination if page and limit are provided
    if (skip !== null && limit !== null) {
      patientsQuery = patientsQuery.skip(skip).limit(limit);
    }

    // Execute the query
    const patients = await patientsQuery.exec();

    // Get total count for pagination metadata
    const totalPatients = await PatientProfile.countDocuments({
      _id: { $in: uniquePatientIds },
    });

    // Prepare the response
    const response = {
      message: "Patients retrieved successfully",
      patients,
    };

    if (page && limit) {
      response.currentPage = page;
      response.totalPages = Math.ceil(totalPatients / limit);
      response.totalPatients = totalPatients;
    }

    return res.status(200).json(response);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error retrieving patients", error: err.message });
  }
};

// Create Patient Profile
export const createPatientProfile = async (req, res) => {
  const {
    dateOfBirth,
    gender,
    medicalConditions,
    medications,
    emergencyContact,
    guardianContact,
    medicalHistory,
    bloodType,
    address,
  } = req.body;
  const userId = req.userId;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== "patient")
      return res.status(403).json({ message: "Unauthorized" });

    const existingProfile = await PatientProfile.findOne({ userId });
    if (existingProfile)
      return res.status(400).json({ message: "Profile already exists" });

    if (req.file) {
      const imageUrl = await uploadToBlob(req.file); // Upload to blob storage
      user.profilePicture = imageUrl;
    }

    const newProfile = new PatientProfile({
      userId,
      dateOfBirth,
      gender,
      address,
      medicalConditions,
      medications,
      emergencyContact,
      medicalHistory,
      bloodType,
      guardianContact,
    });

    await newProfile.save();
    user.profileId = newProfile._id;
    await user.save();

    const accessToken = generateAccessToken(userId, user.role, newProfile._id);
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 1000,
    });

    return res.status(201).json({
      message: "Patient profile created successfully",
      profile: {
        ...newProfile.toJSON({
          versionKey: false,
          transform: (doc, ret) => {
            delete ret.userId;
            return ret;
          },
        }),
        userId: user,
      },
      accessToken,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error creating profile", error: err.message });
  }
};

// Get Patient Profile
export const getPatientProfile = async (req, res) => {
  const id = req.params.id || req.profileId;
  try {
    let profile;
    if (!id) {
      return res.status(404).json({ message: "Id not found" });
    }

    if (req.role === "patient") {
      profile = await PatientProfile.findById(id, { id: 0 }).populate({
        path: "userId",
        select: "-password -profileId -id",
      });
    }

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.status(200).json({ profile });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching profile", error: err.message });
  }
};

// Update Patient Profile
export const updatePatientProfile = async (req, res) => {
  const { profileId } = req;
  const updates = req.body;

  const userFields = ["name", "phoneNumber", "password", "profilePicture"];
  const profileUpdates = {};
  const userUpdates = {};

  for (const key in updates) {
    if (userFields.includes(key)) {
      userUpdates[key] = updates[key];
    } else {
      profileUpdates[key] = updates[key];
    }
  }

  try {
    const profile = await PatientProfile.findById(profileId);
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const user = await User.findOne({ profileId });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.file) {
      if (user.profilePicture && !user.socialLogins.length) {
        await deleteFileFromBlob(user.profilePicture);
      }
      const imageUrl = await uploadToBlob(req.file);
      userUpdates.profilePicture = imageUrl;
    }

    const updatedProfile = await PatientProfile.findByIdAndUpdate(
      profileId,
      { $set: profileUpdates },
      { new: true }
    );

    if (userUpdates.password) {
      const salt = await bcrypt.genSalt(10);
      userUpdates.password = await bcrypt.hash(userUpdates.password, salt);
    }

    const updatedUser = await User.findOneAndUpdate(
      { profileId },
      { $set: userUpdates },
      { new: true }
    );

    return res.status(200).json({
      message: "Profile updated successfully",
      profile: {
        ...updatedProfile.toJSON({
          versionKey: false,
          transform: (doc, ret) => {
            delete ret.userId;
            return ret;
          },
        }),
        userId: updatedUser,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error updating profile", error: err.message });
  }
};

// Delete Patient Profile
export const deletePatientProfile = async (req, res) => {
  try {
    // Attempt to delete all associated data for the user
    await deleteUserData(req.profileId);

    // Proceed to delete the main profile if all associated deletions succeeded
    const profile = await PatientProfile.findOneAndDelete(req.profileId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.status(200).json({ message: "Profile deleted successfully" });
  } catch (err) {
    console.error("Error deleting profile and associated data:", err);
    return res
      .status(500)
      .json({ message: "Error deleting profile", error: err.message });
  }
};
