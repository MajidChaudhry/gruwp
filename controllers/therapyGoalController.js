import TherapyGoal from "../models/TherapyGoalModel.js";
import { createNotification } from "./notificationController.js";
import { pusher } from "../config/pusher.js";
import containerClient from "../config/azureBlobConfig.js";
import { uploadToBlob, deleteFileFromBlob } from "../utils/azureBlobUtils.js";
// Create a new Therapy Goal
export const createTherapyGoal = async (req, res) => {
  const id = req.profileId;
  const userRole = req.role;

  let therapistID;
  if (userRole === "therapist") {
    therapistID = id;
  }
  const { patientId, title, startDate, endDate, totalSessions, description } =
    req.body;

  try {
    let blobUrl = null;

    // Check for file presence and upload if available
    if (req.file) {
      try {
        blobUrl = await uploadToBlob(req.file);
        console.log("Blob URL:", blobUrl);
      } catch (uploadError) {
        console.error("Error during file upload:", uploadError.message);
        return res.status(500).json({
          message: "File upload to Blob Storage failed",
          error: uploadError.message,
        });
      }
    }

    // Create and save the Therapy Goal with or without the blob URL
    const therapyGoal = new TherapyGoal({
      patientId,
      therapistId: therapistID,
      title,
      startDate,
      endDate,
      totalSessions: totalSessions.toString(),
      description,
      attachment: blobUrl, // will be null if no file was uploaded
    });

    await therapyGoal.save();
    console.log("Therapy goal saved successfully");

    // Notify the patient
    const notificationMessage = `A new therapy goal titled "${title}" has been created for you.`;
    await createNotification(
      patientId,
      "TherapyGoal",
      notificationMessage,
      therapyGoal._id
    );

    // Real-time notification via Pusher
    pusher.trigger(`patient-${patientId}`, "notification", {
      type: "TherapyGoal",
      message: notificationMessage,
      referenceId: therapyGoal._id,
    });

    return res
      .status(201)
      .json({ message: "Therapy goal created successfully", therapyGoal });
  } catch (err) {
    console.error("Error creating therapy goal:", err.message);
    return res
      .status(500)
      .json({ message: "Error creating therapy goal", error: err.message });
  }
};

// Get a single Therapy Goal by ID
export const getTherapyGoalById = async (req, res) => {
  try {
    const therapyGoal = await TherapyGoal.findById(req.params.id);
    if (!therapyGoal)
      return res.status(404).json({ message: "Therapy goal not found" });
    return res.status(200).json(therapyGoal);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching therapy goal", error: err.message });
  }
};

// Get all Therapy Goals with pagination
export const getAllTherapyGoals = async (req, res) => {
  const profileId = req.params.id || req.profileId; // Logged-in user's profile ID (therapist or patient)

  // Optional pagination parameters
  const page = req.query.page ? parseInt(req.query.page) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const skip = page && limit ? (page - 1) * limit : null;

  try {
    // Find therapy goals where the logged-in user is either the therapist or patient
    const therapyGoalsQuery = {
      $or: [
        { therapistId: profileId }, // Logged-in user is the therapist
        { patientId: profileId }, // Logged-in user is the patient
      ],
    };

    // Query the database for therapy goals with optional pagination
    const therapyGoals = await TherapyGoal.find(therapyGoalsQuery)
      .skip(skip) // Apply skip if pagination is used
      .limit(limit) // Apply limit if pagination is used
      .exec();

    // Count the total number of therapy goals for the logged-in user
    const totalTherapyGoals = await TherapyGoal.countDocuments(
      therapyGoalsQuery
    );

    // Calculate the total number of pages for pagination
    const totalPages = limit ? Math.ceil(totalTherapyGoals / limit) : null;

    // Prepare the response
    let response = { therapyGoals };

    // Add pagination metadata if page and limit are provided
    if (page && limit) {
      response.currentPage = page;
      response.totalPages = totalPages;
      response.totalTherapyGoals = totalTherapyGoals;
    }
    if (!therapyGoals.length) {
      return res.status(404).json({ message: "No therapyGoals found" });
    }
    // Send the response
    return res.status(200).json(response);
  } catch (err) {
    // Handle errors and return an appropriate error response
    return res
      .status(500)
      .json({ message: "Error fetching therapy goals", error: err.message });
  }
};

// Update progress (correct/incorrect) for a Therapy Goal
export const updateGoalProgress = async (req, res) => {
  const { id } = req.params; // Therapy Goal ID
  const { correct = 0, incorrect = 0 } = req.body; // Values to add to correct/incorrect counts

  try {
    // Find the therapy goal by ID
    const therapyGoal = await TherapyGoal.findById(id);
    if (!therapyGoal) {
      return res.status(404).json({ message: "Therapy goal not found" });
    }

    // Update the correct and incorrect counts
    therapyGoal.progress.correct += correct;
    therapyGoal.progress.incorrect += incorrect;

    // Recalculate the percentage
    const totalAttempts =
      therapyGoal.progress.correct + therapyGoal.progress.incorrect;
    therapyGoal.progress.percentage =
      totalAttempts > 0
        ? (therapyGoal.progress.correct / totalAttempts) * 100
        : 0;

    // Save the updated therapy goal
    await therapyGoal.save();

    return res.status(200).json({
      message: "Therapy goal progress updated successfully",
      progress: therapyGoal.progress,
    });
  } catch (err) {
    return res
      .status(500)
      .json({
        message: "Error updating therapy goal progress",
        error: err.message,
      });
  }
};

// Update a Therapy Goal
export const updateTherapyGoal = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const { correct = 0, incorrect = 0 } = req.body; // Values to add to correct/incorrect counts if provided
   console.log("progress",correct,incorrect)
  try {
    const therapyGoal = await TherapyGoal.findById(id);
    if (!therapyGoal) {
      return res.status(404).json({ message: "Therapy goal not found" });
    }
    
      therapyGoal.progress.correct += correct;
      therapyGoal.progress.incorrect += incorrect;

      // Recalculate the percentage
      const totalAttempts =
        therapyGoal.progress.correct + therapyGoal.progress.incorrect;
      therapyGoal.progress.percentage =
        totalAttempts > 0
          ? (therapyGoal.progress.correct / totalAttempts) * 100
          : 0;
    
    // Check if there's a new file to upload, delete the old one first
    if (req.file) {
      try {
        if (therapyGoal.attachment)
          await deleteFileFromBlob(therapyGoal.attachment);
        updates.attachment = await uploadToBlob(req.file);
      } catch (err) {
        console.error("Error handling file upload or deletion:", err.message);
        return res
          .status(500)
          .json({ message: "Failed to update file attachment" });
      }
    }
    await therapyGoal.save();
    const updatedTherapyGoal = await TherapyGoal.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    const notificationMessage = `Your therapy goal titled "${updatedTherapyGoal.title}" has been updated.`;
    await createNotification(
      updatedTherapyGoal.patientId,
      "TherapyGoal",
      notificationMessage,
      updatedTherapyGoal._id
    );

    pusher.trigger(`patient-${updatedTherapyGoal.patientId}`, "notification", {
      type: "TherapyGoal",
      message: notificationMessage,
      referenceId: updatedTherapyGoal._id,
    });
    return res.status(200).json({
      message: "Therapy goal updated successfully",
      updatedTherapyGoal,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error updating therapy goal", error: err.message });
  }
};

// Delete a Therapy Goal or Multiple Therapy Goals
export const deleteTherapyGoal = async (req, res) => {
  const { id } = req.params;
  const { ids } = req.body;

  try {
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const therapyGoals = await TherapyGoal.find({ _id: { $in: ids } });
      await Promise.all(
        therapyGoals.map(async (goal) => {
          try {
            await deleteFileFromBlob(goal.attachment);
          } catch (err) {
            console.error(
              `Error deleting file for therapy goal ${goal._id}:`,
              err.message
            );
          }
        })
      );

      const result = await TherapyGoal.deleteMany({ _id: { $in: ids } });
      if (result.deletedCount === 0) {
        return res
          .status(404)
          .json({ message: "No therapy goals found for the provided IDs" });
      }

      return res.status(200).json({
        message: "Therapy goals deleted successfully",
        deletedCount: result.deletedCount,
      });
    }

    if (id) {
      const therapyGoal = await TherapyGoal.findById(id);
      if (!therapyGoal)
        return res.status(404).json({ message: "Therapy goal not found" });

      try {
        if (therapyGoal.attachment)
          await deleteFileFromBlob(therapyGoal.attachment);
      } catch (err) {
        console.error(
          `Error deleting file for therapy goal ${id}:`,
          err.message
        );
      }

      await TherapyGoal.findByIdAndDelete(id);
      return res
        .status(200)
        .json({ message: "Therapy goal deleted successfully" });
    }

    return res
      .status(400)
      .json({ message: "No ID or IDs provided for deletion" });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error deleting therapy goal(s)", error: err.message });
  }
};

// Delete Therapy Goals for a specific user ID
export const deleteTherapyGoals = async (id) => {
  try {
    const therapyGoals = await TherapyGoal.find({
      $or: [{ therapistId: id }, { patientId: id }],
    });
    await Promise.all(
      therapyGoals.map(async (goal) => {
        try {
          await deleteFileFromBlob(goal.attachment);
        } catch (err) {
          console.error(
            `Error deleting file for therapy goal ${goal._id}:`,
            err.message
          );
        }
      })
    );

    const result = await TherapyGoal.deleteMany({
      $or: [{ therapistId: id }, { patientId: id }],
    });

    if (result.deletedCount === 0) {
      return { message: "No therapy goals found for the provided ID" };
    }

    return {
      message: "Therapy goals deleted successfully",
      deletedCount: result.deletedCount,
    };
  } catch (err) {
    return { message: "Error deleting therapy goals", error: err.message };
  }
};
