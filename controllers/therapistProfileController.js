import TherapistProfile from "../models/TherapistProfile.js";
import User from "../models/UserModel.js";
import { generateAccessToken } from "../utils/tokenUtils.js";
import deleteUserData from "./UserCleanupController.js";

import { uploadToBlob, deleteFileFromBlob } from "../utils/azureBlobUtils.js";
// Helper function to merge slots for duplicate days
const mergeSlotsByDay = (days) => {
  const dayMap = {};

  days.forEach(({ day, available = true, slots }) => {
    if (!dayMap[day]) {
      dayMap[day] = { day, available, slots: [] };
    }
    dayMap[day].slots = [...dayMap[day].slots, ...slots];
  });

  return Object.values(dayMap);
};

// Add a review to a therapist
export const addReview = async (req, res) => {
  const { therapistId, rating, comment } = req.body;
  const user = req.userId; // Current logged-in user's ID

  try {
    // Validate input
    if (!therapistId || !rating || !comment) {
      return res.status(400).json({ message: "Therapist ID, rating, and comment are required" });
    }

    // Check if the therapist exists
    const therapistProfile = await TherapistProfile.findById(therapistId);
    if (!therapistProfile) {
      return res.status(404).json({ message: "Therapist not found" });
    }

    // Create the review object
    const newReview = {
      user,
      rating,
      comment,
      createdAt: new Date(),
    };

    // Add the review to the therapist's profile
    therapistProfile.reviews.push(newReview);
    await therapistProfile.save();

    return res.status(201).json({
      message: "Review added successfully",
      review: newReview,
    });
  } catch (err) {
    return res.status(500).json({ message: "Error adding review", error: err.message });
  }
};

export const createTherapistProfile = async (req, res) => {
  const {
    specializations,
    qualifications,
    medicalLicenseNumber,
    yearsExperience,
    consultationDays,
    bio,
    location,
  } = req.body;
  const userId = req.userId;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== "therapist")
      return res.status(403).json({ message: "Unauthorized" });

    // Handle profile picture upload if present
    if (req.file) {
      const imageUrl = await uploadToBlob(req.file); // Upload to blob storage
      user.profilePicture = imageUrl;
    }

    // Prevent duplicate profile creation
    const existingProfile = await TherapistProfile.findOne({ userId });
    if (existingProfile)
      return res.status(400).json({ message: "Profile already exists" });

    const mergedConsultationDays = mergeSlotsByDay(consultationDays);
    const newProfile = new TherapistProfile({
      userId,
      specializations,
      qualifications,
      consultationDays: mergedConsultationDays,
      medicalLicenseNumber,
      yearsExperience,
      bio,
      location
    });

    await newProfile.save();
    user.profileId = newProfile._id;
    await user.save();

    const accessToken = generateAccessToken(userId, user.role, newProfile._id);
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      message: "Therapist profile created successfully",
      profile: {
        ...newProfile.toJSON({
          versionKey: false,
          transform: (doc, ret) => {
            delete ret.userId; // Delete userId from the response
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
export const getTherapistProfileWithOutAuth = async (req, res) => {
  const id = req.params.id;
  try {
    if (!id) {
      return res.status(404).json({ message: "Id not found" });
    }

    // Retrieve profile with limited fields
    const profile = await TherapistProfile.findById(id)
      .select('-medicalLicenseNumber') // Exclude unnecessary fields from TherapistProfile
      .populate({
        path: 'userId',
        select: 'name email profilePicture' // Only include name, email, and profilePicture from userId
      });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Return the limited profile data
    return res.status(200).json({ profile });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching profile", error: err.message });
  }
};

// Get Therapist Profile
export const getTherapistProfile = async (req, res) => {
  const id = req.params.id || req.profileId;
  try {
    if (!id) {
      return res.status(404).json({ message: "Id not found" });
    }
   const profile = await TherapistProfile.findById(id).populate({
      path: "userId",
      select: "-password -profileId -id",
    })
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    
    return res.status(200).json({ profile });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching profile", error: err.message });
  }
};

export const getAllTherapists = async (req, res) => {
  // Optional pagination parameters
  const page = req.query.page ? parseInt(req.query.page) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const skip = page && limit ? (page - 1) * limit : null;

  // Optional query parameters for location and specializations
  const location = req.query.location ? req.query.location : null;
  const specialization = req.query.specialization ? req.query.specialization : null;

  try {
    let query = TherapistProfile.find()
      .select('-medicalLicenseNumber') // Excludes medicalLicenseNumber from TherapistProfile
      .populate({
        path: 'userId',
        select: 'name email profilePicture' // Only includes name, email, and profilePicture from userId
      });

    // Apply location filter if location query parameter is provided
    if (location) {
      query = query.where('location').regex(new RegExp(location, 'i')); // Regex for partial match, case-insensitive
    }

    // Apply specialization filter if specialization query parameter is provided
    if (specialization) {
      query = query.where('specializations').regex(new RegExp(specialization, 'i')); // Regex for partial match, case-insensitive
    }

    // Apply skip and limit only if both page and limit are provided
    if (skip !== null && limit !== null) {
      query = query.skip(skip).limit(limit);
    }

    // Execute the query
    const therapists = await query.exec();

    // Get the total count of therapists for pagination
    const totalTherapists = await TherapistProfile.countDocuments();

    // Calculate total pages only if limit is provided
    const totalPages = limit ? Math.ceil(totalTherapists / limit) : null;

    // Prepare response object
    let response = {
      therapists,
      totalTherapists,
    };

    // Add pagination metadata if page and limit are provided
    if (page && limit) {
      response.currentPage = page;
      response.totalPages = totalPages;
      response.limit = limit;
    }

    return res.status(200).json(response);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching therapists", error: err.message });
  }
};


export const getTherapistsForPatient = async (req, res) => {
  // Get id from req.params.id or fallback to req.profileId
  const id = req.params.id || req.profileId;

  // Check if the user is a patient
  if (req.role !== "patient") {
    return res.status(403).json({
      message: "Unauthorized. Only patients can access this resource.",
    });
  }

  try {
    // Find all appointments for the patient
    const appointments = await Appointment.find({ patientId: id }).select(
      "therapistId"
    );

    // If no appointments are found, return an error
    if (!appointments.length) {
      return res
        .status(404)
        .json({ message: "No appointments found for this patient." });
    }

    // Extract therapist IDs from the appointments
    const therapistIds = appointments.map(
      (appointment) => appointment.therapistId
    );

    // Find therapist profiles based on the extracted therapist IDs
    const therapists = await TherapistProfile.find({
      userId: { $in: therapistIds },
    }).populate("userId");

    // If no therapists are found, return an error
    if (!therapists.length) {
      return res
        .status(404)
        .json({ message: "No therapists found for this patient." });
    }

    return res.status(200).json({ therapists });
  } catch (err) {
    return res.status(500).json({
      message: "Error fetching therapists for patient",
      error: err.message,
    });
  }
};

// Update Therapist Profile
export const updateTherapistProfile = async (req, res) => {
  const id = req.profileId;
  const updates = req.body;
  const userFields = ["name", "phoneNumber", "password", "profilePicture"];
  const profileUpdates = {};
  const userUpdates = {};

  // Sort updates for User or Profile fields
  for (const key in updates) {
    if (userFields.includes(key)) {
      userUpdates[key] = updates[key];
    } else if (key === "consultationDays") {
      profileUpdates.consultationDays = mergeSlotsByDay(
        updates.consultationDays
      );
    } else {
      profileUpdates[key] = updates[key];
    }
  }

  try {
    const profile = await TherapistProfile.findById(id);
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    // Handle profile picture upload, checking for social login URL
    const user = await User.findOne({ profileId: id });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.file) {
      if (user.profilePicture && !user.socialLogins.length) {
        await deleteFileFromBlob(user.profilePicture); // Delete previous image only if no social login
      }
      const imageUrl = await uploadToBlob(req.file);
      userUpdates.profilePicture = imageUrl;
    }

    // Update the profile and user documents
    const updatedProfile = await TherapistProfile.findByIdAndUpdate(
      id,
      { $set: profileUpdates },
      { new: true }
    );
    if (userUpdates.password)
      userUpdates.password = await bcrypt.hash(userUpdates.password, 10);
    const updatedUser = await User.findOneAndUpdate(
      { profileId: id },
      { $set: userUpdates },
      { new: true }
    );

    return res.status(200).json({
      message: "Profile updated successfully",
      profile: {
        ...updatedProfile.toJSON({
          versionKey: false,
          transform: (doc, ret) => {
            delete ret.userId; // Delete userId from the response
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

// Delete Therapist Profile
export const deleteTherapistProfile = async (req, res) => {
  try {
    // Attempt to delete all related data for the user
    await deleteUserData(req.profileId);

    // Only delete the main profile if all related data deletions succeeded
    const profile = await TherapistProfile.findOneAndDelete(req.profileId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.status(200).json({ message: "Profile deleted successfully" });
  } catch (err) {
    // Error if deletion of related data or profile deletion failed
    console.error("Error deleting profile and related data:", err);
    return res
      .status(500)
      .json({ message: "Error deleting profile", error: err.message });
  }
};



export const searchTherapists = async (req, res) => {
  try {
    // Optional query parameters for search, pagination, location, and specialization
    const query = req.query.query ? req.query.query : null;
    const location = req.query.location ? req.query.location : null;
    const specialization = req.query.specialization ? req.query.specialization : null;
    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const skip = page && limit ? (page - 1) * limit : null;

    // Define the filters array
    const filters = [];

    // Add search query filter if provided
    if (query) {
      const searchRegex = new RegExp(query, 'i');
      filters.push({
        $or: [
          { 'userDetails.name': { $regex: searchRegex } },
          { 'specializations': { $regex: searchRegex } },
          { 'location': { $regex: searchRegex } },
          { 'qualifications': { $regex: searchRegex } },
          { 'bio': { $regex: searchRegex } },
        ],
      });
    }

    // Add location filter if provided
    if (location) {
      filters.push({ location: { $regex: new RegExp(location, 'i') } });
    }

    // Add specialization filter if provided
    if (specialization) {
      filters.push({ specializations: { $regex: new RegExp(specialization, 'i') } });
    }

    // Build the aggregation pipeline
    const aggregationPipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      { $unwind: '$userDetails' },
      {
        $match: filters.length > 0 ? { $and: filters } : {}, // Apply filters if any exist
      },
      {
        $project: {
          userId: {
            name: "$userDetails.name",
            role: "$userDetails.role",
            profilePicture: "$userDetails.profilePicture",
          },
          specializations: 1,
          qualifications: 1,
          bio: 1,
          consultationDays: 1,
          yearsExperience:1,
          location: 1,
          reviews:1,
          patients: 1,
          appointments:1,
        },
      },
    ];

    // Apply pagination if both page and limit are provided
    if (skip !== null && limit !== null) {
      aggregationPipeline.push({ $skip: skip }, { $limit: limit });
    }

    // Execute the main aggregation query
    const results = await TherapistProfile.aggregate(aggregationPipeline);

    // Count total results for pagination
    const totalResults = await TherapistProfile.aggregate([
      { $lookup: aggregationPipeline[0].$lookup },
      { $unwind: '$userDetails' },
      { $match: filters.length > 0 ? { $and: filters } : {} },
      { $count: "total" },
    ]);

    const totalTherapists = totalResults.length > 0 ? totalResults[0].total : 0;
    const totalPages = limit ? Math.ceil(totalTherapists / limit) : null;

    return res.json({
      success: true,
      data: results,
      pagination: {
        currentPage: page,
        totalPages,
        totalTherapists,
        limit,
      },
    });
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
