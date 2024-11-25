import ChatRoom from "../models/ChatRoomModel.js";
import Message from "../models/MessageModel.js";
import Call from "../models/CallModel.js";
import { pusher } from "../config/pusher.js";
import { uploadToBlob, deleteFileFromBlob } from "../utils/azureBlobUtils.js";
import bcrypt from "bcrypt";

export const createOrUpdateChatRoom = async (patientId, therapistId, appointmentId) => {
  try {
    // Find existing chat room
    let chatRoom = await ChatRoom.findOne({ patientId, therapistId });

    if (chatRoom) {
      // If chat room exists, add the new appointment ID
      if (!chatRoom.appointments.includes(appointmentId)) {
        chatRoom.appointments.push(appointmentId);
        await chatRoom.save();
      }
    } else {
      // If chat room doesn't exist, create a new one
      const sessionName = `${patientId}-${therapistId}`; // Combine IDs for session name
      const sessionPasswordPlain = `${therapistId}-${Date.now()}`; // Generate a plain password
      const sessionPassword = await bcrypt.hash(sessionPasswordPlain, 10); // Hash the password

      chatRoom = new ChatRoom({
        patientId,
        therapistId,
        appointments: [appointmentId],
        sessionName,
        sessionPassword,
      });
      await chatRoom.save();
    }

    return chatRoom;
  } catch (error) {
    console.error("Error in createOrUpdateChatRoom:", error);
    throw error; // Re-throw for handling in the calling function
  }
};

// Fetch a unique chat room by appointment ID
export const getChatRoomByAppointmentId = async (req, res) => {
  const { id } = req.params;

  try {
  
    // Find the chat room that includes the given appointmentId
    const chatRoom = await ChatRoom.findOne({
      appointments: { $in: id },
    })
      .populate({
        path: "therapistId",
        select: "_id",
        populate: {
          path: "userId",
          select: "name email profilePicture deviceId", // Select only required user fields
        },
      })
      .populate({
        path: "patientId",
        select: "_id",
        populate: {
          path: "userId",
          select: "name email profilePicture deviceId", // Select only required user fields
        },
      });

    // If no chat room is found, return a 404 response
    if (!chatRoom) {
      return res.status(404).json({ error: "Chat room not found for the given appointment ID" });
    }

    res.status(200).json(chatRoom);
  } catch (error) {
    console.error("Error fetching chat room by appointment ID:", error);
    res.status(500).json({ error: "Error fetching chat room" });
  }
};

// Create or fetch existing chat room
export const createChatRoom = async (req, res) => {
  const userProfileId = req.profileId;
  const userRole = req.role;

  try {
    // Determine the patient and therapist IDs based on the role of the logged-in user
    const isTherapist = userRole === "therapist";
    const therapistId = isTherapist ? userProfileId : req.body.therapistId;
    const patientId = !isTherapist ? userProfileId : req.body.patientId;

    // Check if a chat room already exists between the patient and therapist
    let chatRoom = await ChatRoom.findOne({ patientId, therapistId });
    if (!chatRoom) {
      chatRoom = new ChatRoom({ patientId, therapistId });
      await chatRoom.save();
    }

    res.status(200).json(chatRoom);
  } catch (error) {
    res.status(500).json({ error: "Error creating or fetching chat room" });
  }
};

// Fetch all chat rooms for the logged-in user or a specific user ID
export const getChatRoom = async (req, res) => {
  const userId = req.params.id || req.profileId; // Use userId from params or profileId
  // Optional pagination parameters
  const page = req.query.page ? parseInt(req.query.page) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const skip = page && limit ? (page - 1) * limit : null;

  try {
    // Define query for chat rooms based on userId
    const query = {
      $or: [{ patientId: userId }, { therapistId: userId }],
    };

    // Fetch chat rooms with optional pagination
    const chatRooms = await ChatRoom.find(query)
      .skip(skip)
      .limit(limit)
      .populate({
        path: "therapistId",
        select: "_id", // Fetch only required fields from TherapistProfile
        populate: {
          path: "userId",
          select: "name email profilePicture deviceId", // Select only the user fields you want
        },
      })
      .populate({
        path: "patientId",
        select: "_id", // Fetch only required fields from PatientProfile
        populate: {
          path: "userId",
          select: "name email profilePicture deviceId", // Select only the user fields you want
        },
      });

    // If pagination is used, get the total count for pagination metadata
    let totalCount = 0;
    if (page && limit) {
      totalCount = await ChatRoom.countDocuments(query);
    }

    // Return chat rooms with or without pagination metadata
    const response = {
      chatRooms,
    };

    if (page && limit) {
      response.currentPage = page;
      response.totalPages = Math.ceil(totalCount / limit);
      response.totalChatRooms = totalCount;
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving chat rooms" });
  }
};

// Get messages in a chat room
export const getMessages = async (req, res) => {
  const { chatRoomId } = req.params;
  // Optional pagination parameters
  const page = req.query.page ? parseInt(req.query.page) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const skip = page && limit ? (page - 1) * limit : null;

  try {
    // Define the query to find messages
    const query = { chatRoomId };

    // Fetch messages with optional pagination
    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    // If pagination is used, get the total count for pagination metadata
    let totalCount = 0;
    if (page && limit) {
      totalCount = await Message.countDocuments(query);
    }

    // Return messages with or without pagination metadata
    const response = {
      messages,
    };

    if (page && limit) {
      response.currentPage = page;
      response.totalPages = Math.ceil(totalCount / limit);
      response.totalMessages = totalCount;
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving messages" });
  }
};

// Send a message in the chat room
export const sendMessage = async (req, res) => {
  const {  text, type } = req.body;
  const { chatRoomId } = req.params;
  const senderId = req.profileId;
  let mediaUrl = null;

  try {
    // If there’s an attachment, upload it to Azure Blob
    if (req.file) {
      mediaUrl = await uploadToBlob(req.file);
    }

    const message = new Message({
      chatRoomId,
      senderId,
      text,
      media: mediaUrl,
      type,
    });
    await message.save();

    // Update last message and message list in the ChatRoom
    await ChatRoom.findByIdAndUpdate(chatRoomId, {
      lastMessage: text,
      $push: { messageId: message._id },
    });

    // Notify chat room users
    pusher.trigger(`chat-${chatRoomId}`, "new-message", message);

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: "Error sending message" });
  }
};

// Delete messages based on different conditions
export const deleteMessage = async (req, res) => {
  const { id } = req.params; // Get message ID from URL parameters
  const { ids } = req.body; // Get array of IDs from request body
  const userId = req.profileId; // Get logged-in user's ID from profile

  try {
    // If a specific message ID is provided in params
    if (id) {
      const message = await Message.findByIdAndDelete(id);

      if (message) {
        // Delete media from blob storage if exists
        if (message.media) {
          await deleteFileFromBlob(message.media);
        }

        pusher.trigger(`chat-${message.chatRoomId}`, "delete-message", { id });
        return res
          .status(200)
          .json({ message: "Message deleted successfully" });
      } else {
        return res.status(404).json({ error: "Message not found" });
      }
    }

    // If an array of IDs is provided in the body
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const messages = await Message.find({ _id: { $in: ids } });

      // Delete messages and their media
      await Promise.all(
        messages.map(async (msg) => {
          if (msg.media) {
            await deleteFileFromBlob(msg.media); // Delete media from blob storage
          }
          await Message.findByIdAndDelete(msg._id); // Delete the message
          pusher.trigger(`chat-${msg.chatRoomId}`, "delete-message", {
            id: msg._id,
          });
        })
      );

      return res.status(200).json({ message: "Messages deleted successfully" });
    }

    // If no messageId or ids provided, delete all messages for the logged-in user
    const deletedMessages = await Message.deleteMany({
      $or: [
        { senderId: userId }, // Messages sent by the logged-in user
        { receiverId: userId }, // Messages received by the logged-in user (if applicable)
      ],
    });

    return res
      .status(200)
      .json({
        message: `${deletedMessages.deletedCount} messages deleted successfully`,
      });
  } catch (error) {
    console.error("Error deleting message(s):", error);
    return res.status(500).json({ error: "Error deleting message(s)" });
  }
};

// Update typing status
export const setTypingStatus = async (req, res) => {
  const { chatRoomId, isTyping } = req.body;
  const userId = req.profileId;

  try {
    pusher.trigger(`chat-${chatRoomId}`, "typing-status", { userId, isTyping });
    res.status(200).json({ message: "Typing status updated" });
  } catch (error) {
    console.error("Error setting typing status:", error);
    res.status(500).json({ error: "Error updating typing status" });
  }
};

// Update voicing status
export const setVoicingStatus = async (req, res) => {
  const { chatRoomId, isVoicing } = req.body;
  const userId = req.profileId;

  try {
    pusher.trigger(`chat-${chatRoomId}`, "voicing-status", {
      userId,
      isVoicing,
    });
    res.status(200).json({ message: "Voicing status updated" });
  } catch (error) {
    console.error("Error setting voicing status:", error);
    res.status(500).json({ error: "Error updating voicing status" });
  }
};
