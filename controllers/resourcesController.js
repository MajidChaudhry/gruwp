import Resources from "../models/ResourcesModel.js";
import { createNotification } from "./notificationController.js";
import { pusher } from "../config/pusher.js";
import { uploadToBlob, deleteFileFromBlob } from "../utils/azureBlobUtils.js";

// Create Resource with file upload handling
export const createResource = async (req, res) => {
  const { patientIds, date, type, title, details, therapyType } = req.body;
  const therapistId = req.profileId;
  let blobUrl = null;
console.log(patientIds, date, type, title, details, therapyType,req.file)
  try {
    if (req.file) {
      try {
        blobUrl = await uploadToBlob(req.file);
        console.log("File uploaded successfully:", blobUrl);
      } catch (uploadError) {
        console.error("Error during file upload:", uploadError.message);
        return res
          .status(500)
          .json({ message: "File upload failed", error: uploadError.message });
      }
    }

    const newResource = new Resources({
      patientIds: Array.isArray(patientIds) ? patientIds : [patientIds],
      therapistId,
      date,
      type,
      title,
      details,
      therapyType,
      media: blobUrl, // Save the uploaded file URL in the 'media' field
    });

    await newResource.save();

   // Notification handling
   const patientIdArray = Array.isArray(patientIds) ? patientIds : [patientIds];
   if (patientIdArray.length > 0) {
     const notificationMessage = `A new resource titled "${title}" has been created for you.`;
     await Promise.all(
       patientIdArray.map(async (patientId) => {
         await createNotification(
           patientId,
           "Resource",
           notificationMessage,
           newResource._id
         );
         pusher.trigger(`patient-${patientId}`, "notification", {
           type: "Resource",
           message: notificationMessage,
           referenceId: newResource._id,
         });
       })
     );
   }

    return res.status(201).json({
      message: "Resource created successfully",
      resource: newResource,
    });
  } catch (err) {
    console.error("Error creating resource:", err.message);
    return res
      .status(500)
      .json({ message: "Error creating resource", error: err.message });
  }
};

// Update Resource with file delete and new upload handling
export const updateResource = async (req, res) => {
  const updates = req.body;
  let blobUrl = null;

  try {
    const resource = await Resources.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    // Delete existing file if there's a new file in the request
    if (req.file && resource.media) {
      try {
        await deleteFileFromBlob(resource.media);
        console.log("Existing file deleted successfully");
      } catch (deleteError) {
        console.error("Error deleting old file:", deleteError.message);
      }
    }

    // Upload new file if provided
    if (req.file) {
      try {
        updates.media = await uploadToBlob(req.file);
        console.log("New file uploaded successfully:", blobUrl);
      } catch (uploadError) {
        console.error("Error during new file upload:", uploadError.message);
        return res.status(500).json({
          message: "New file upload failed",
          error: uploadError.message,
        });
      }
    }

    const updatedResource = await Resources.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );
    return res.status(200).json({
      message: "Resource updated successfully",
      resource: updatedResource,
    });
  } catch (err) {
    console.error("Error updating resource:", err.message);
    return res
      .status(500)
      .json({ message: "Error updating resource", error: err.message });
  }
};

// Delete Resource (Single or Multiple)
export const deleteResource = async (req, res) => {
  const { id } = req.params; // Single ID from params
  const { ids } = req.body; // Array of IDs from body for multiple deletions

  try {
    // Handle multiple deletions if an array of IDs is provided
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const resources = await Resources.find({ _id: { $in: ids } });
      if (resources.length === 0) {
        return res
          .status(404)
          .json({ message: "No resources found for the provided IDs" });
      }

      // Delete files from blob storage
      await Promise.all(
        resources.map((resource) => deleteFileFromBlob(resource.filePath))
      );

      // Delete resources from database
      const result = await Resources.deleteMany({ _id: { $in: ids } });

      return res.status(200).json({
        message: "Resources deleted successfully",
        deletedCount: result.deletedCount,
      });
    }

    // Handle single deletion
    if (id) {
      const resource = await Resources.findById(id);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }

      // Delete file from blob storage
      await deleteFileFromBlob(resource.filePath);

      // Delete resource from database
      await resource.deleteOne();

      return res.status(200).json({ message: "Resource deleted successfully" });
    }

    // If neither a single ID nor an array of IDs is provided
    return res
      .status(400)
      .json({ message: "No ID or IDs provided for deletion" });
  } catch (err) {
    return res.status(500).json({
      message: "Error deleting resource(s)",
      error: err.message,
    });
  }
};

// Get All Resources (with Pagination)
export const getAllResources = async (req, res) => {
  const profileId = req.params.id || req.profileId; // Therapist or patient ID

  // Optional pagination parameters
  const page = req.query.page ? parseInt(req.query.page) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const skip = page && limit ? (page - 1) * limit : 0; // Default to 0 if page or limit is not provided

  try {
    // Build the base query to find resources based on user role
    const resourcesQuery = {
      $or: [
        { therapistId: profileId }, // Show if the logged-in user is the therapist
        { patientIds: profileId },  // Show if the resource is meant for this specific patient
        { patientIds: { $exists: false } }, // Show resources meant for all patients
      ],
    };

    // Add type filter if the type query parameter is provided
    if (req.query.type) {
      resourcesQuery.type = req.query.type;
    }

    // Execute the query with pagination
    const resources = await Resources.find(resourcesQuery)
      .skip(skip) // Use calculated skip
      .limit(limit || 10) 
      .populate({
        path: "therapistId",
        select: "_id", // Fetch only required fields from PatientProfile
        populate: {
          path: "userId", // Populate the userId field from PatientProfile
          select: "name email profilePicture", // Select only the user fields you want
        },
      })
      .exec();

    // Count total resources that match the query
    const totalResources = await Resources.countDocuments(resourcesQuery);
    const totalPages = limit ? Math.ceil(totalResources / limit) : 1; // Total pages calculation

    // Construct response object
    const response = {
      resources,
      totalResources,
    };

    // Add pagination metadata if page and limit are provided
    if (page && limit) {
      response.currentPage = page;
      response.totalPages = totalPages;
    }

    // Send the response
    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({
      message: "Error fetching resources",
      error: err.message,
    });
  }
};


// Get Resource by ID
export const getResourceById = async (req, res) => {
  try {
    // Fetch the resource by ID and populate necessary fields
    const resource = await Resources.findById(req.params.id).populate(
      "patientIds therapistId"
    );

    // Check if the resource exists
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    // Access control checks
    const isTherapist =
      resource.therapistId &&
      resource.therapistId._id.toString() === req.profileId;

    // Check if the resource is meant for specific patients or all patients
    const isPatientResource =
      resource.patientIds && resource.patientIds.length > 0;
    const isPatient = isPatientResource
      ? resource.patientIds.some((p) => p._id.toString() === req.profileId) // Access if the user is one of the specific patients
      : true; // If patientIds is empty, allow all patients

    // Ensure that the user has permission to view this resource
    if (!isTherapist && !isPatient) {
      return res
        .status(403)
        .json({ message: "You do not have access to this resource" });
    }

    // Return the resource if access is allowed
    return res.status(200).json({ resource });
  } catch (err) {
    return res.status(500).json({
      message: "Error fetching resource",
      error: err.message,
    });
  }
};

// Delete all resources for a therapist or patient
export const deleteResources = async (id) => {
  try {
    // Find resources associated with the therapist or patient
    const resources = await Resources.find({
      $or: [
        { therapistId: id },
        { patientIds: id }, // Checks the `patientIds` array
      ],
    });

    if (resources.length === 0) {
      return { message: "No resources found for the provided ID" };
    }

    // Delete files from Blob Storage if they exist in each resource
    for (const resource of resources) {
      if (resource.media) {
        try {
          await deleteFileFromBlob(resource.media);
          console.log(
            "File deleted successfully from Blob Storage for resource ID:",
            resource._id
          );
        } catch (deleteError) {
          console.error(
            "Error deleting file from Blob Storage for resource ID:",
            resource._id,
            deleteError.message
          );
        }
      }
    }

    // Delete the resources from the database
    const result = await Resources.deleteMany({
      _id: { $in: resources.map((resource) => resource._id) },
    });

    return {
      message: "Resources deleted successfully",
      deletedCount: result.deletedCount,
    };
  } catch (err) {
    console.error("Error deleting resources:", err.message);
    return { message: "Error deleting resources", error: err.message };
  }
};
