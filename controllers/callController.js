import ChatRoom from "../models/ChatRoomModel.js"; // Ensure correct path
import { messaging } from "../config/firebase.js";

export const startCallNotification = async (req, res) => {
  const { appointmentId } = req.body;
  const userRole = req.role;

  try {
    // Fetch chat room and user details as before
    const chatRoom = await ChatRoom.findOne({ appointments: appointmentId })
      .populate({
        path: "therapistId",
        select: "_id",
        populate: { path: "userId", select: "name email profilePicture deviceId" },
      })
      .populate({
        path: "patientId",
        select: "_id",
        populate: { path: "userId", select: "name email profilePicture deviceId" },
      });

    if (!chatRoom) {
      return res.status(404).json({ message: "Chat room not found for the given appointment ID." });
    }

    const { sessionName } = chatRoom;
    const therapist = chatRoom.therapistId?.userId;
    const patient = chatRoom.patientId?.userId;

    const isTherapist = userRole === "therapist";
    const otherUser = isTherapist ? patient : therapist;

    if (!otherUser?.deviceId) {
      return res.status(400).json({ message: "Device ID not found for the other user." });
    }

    // Send Firebase push notification
    const payload = {
      notification: {
        title: "Incoming Call",
        body: `You have an incoming call for session: ${sessionName}.`,
      },
      token: otherUser.deviceId, // Firebase token
    };

    await messaging.send(payload);

    return res.status(200).json({ message: "Call notification sent successfully to the other user." });
  } catch (error) {
    console.error("Error in startCallNotification:", error);
    return res.status(500).json({ message: "Failed to send call notification", error: error.message });
  }
};
