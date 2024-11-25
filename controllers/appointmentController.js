import Appointment from "../models/AppointmentModel.js";
import { notifyUsers } from "../services/notificationService.js";
import SOAPNotes from "../models/SOAPNotesModel.js";
import PatientProfile from "../models/PatientProfile.js";
import TherapistProfile from "../models/TherapistProfile.js";
import moment from 'moment-timezone';
import "dotenv/config";
import { createOrUpdateChatRoom } from "./chatController.js";

const timeZone = process.env.DEFAULT_TIME_ZONE || "UTC";

function getDayOfWeekInTimezone(timestamp, timezone) {
  const date = moment.tz(timestamp, timezone);
  return date.format('dddd');
}

export const createAppointment = async (req, res) => {
  const {
    childDetails,
    appointmentType,
    appointmentDate,
    appointmentTime,
    packageType,
    duration = 0,
    notes = "",
  } = req.body;
  const userProfileId = req.profileId;
  const userRole = req.role;

  try {
    let assignedTherapistId, assignedPatientId;

    if (userRole === "therapist") {
      assignedTherapistId = userProfileId;
      assignedPatientId = req.body.patientId;
    } else if (userRole === "patient") {
      assignedPatientId = userProfileId;
      assignedTherapistId = req.body.therapistId;
    } else {
      return res.status(400).json({ message: "Invalid user role" });
    }

    if (!assignedTherapistId || !assignedPatientId) {
      return res.status(400).json({ message: "Therapist and Patient ID are required" });
    }

    const appointmentDay = getDayOfWeekInTimezone(appointmentDate, timeZone);
    const therapist = await TherapistProfile.findById(assignedTherapistId);
    const consultationDay = therapist.consultationDays.find(day => day.day === appointmentDay);

    if (!consultationDay || !consultationDay.available) {
      return res.status(404).json({ message: "No available consultation day found" });
    }

    const slot = consultationDay.slots.find(s => s.start === appointmentTime);

    if (!slot || !slot.available) {
      return res.status(400).json({ message: "Slot is not available" });
    }

    const appointmentDateObj = moment(appointmentDate).toDate();

    // Check if the slot's bookedDates already contains the requested date
    if (slot.bookedDates.some(date => moment(date).isSame(appointmentDateObj, 'day'))) {
      return res.status(400).json({ message: "Slot is already booked on this date" });
    }

    // Create a new appointment
    const newAppointment = new Appointment({
      therapistId: assignedTherapistId,
      patientId: assignedPatientId,
      childDetails,
      appointmentType,
      appointmentDate,
      appointmentTime,
      packageType,
      duration,
      notes,
    });

    await newAppointment.save();

    const patientProfile = await PatientProfile.findById(assignedPatientId);
    if (patientProfile) {
      if (!patientProfile.therapists.includes(assignedTherapistId)) {
        patientProfile.therapists.push(assignedTherapistId);
      }
      patientProfile.appointments.push(newAppointment._id);
      patientProfile.appointmentType = appointmentType;
      await patientProfile.save();
    }

    if (therapist) {
      if (!therapist.patients.includes(assignedPatientId)) {
        therapist.patients.push(assignedPatientId);
      }
      slot.bookedDates.push(appointmentDateObj);
      therapist.appointments.push(newAppointment._id);
      await therapist.save();
    }
    // Call Chat Controller function
    const chatRoom = await createOrUpdateChatRoom(
      assignedPatientId,
      assignedTherapistId,
      newAppointment._id
      
    );
    await notifyUsers(newAppointment, "creation");

    return res.status(201).json({
      message: "Appointment created successfully",
      appointment: newAppointment,
      chatRoom,
    });
  } catch (err) {
    return res.status(500).json({ message: "Error creating appointment", error: err.message });
  }
};

export const getAppointmentById = async (req, res) => {
  const { id } = req.params;
  try {
    const appointment = await Appointment.findById(id)
      .populate({
        path: "therapistId",
        select: "_id",
        populate: {
          path: "userId",
          select: "name email profilePicture",
        },
      })
      .populate({
        path: "patientId",
        select: "_id",
        populate: {
          path: "userId",
          select: "name email profilePicture",
        },
      });

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    return res.status(200).json({ appointment });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching appointment", error: err.message });
  }
};

export const getAppointments = async (req, res) => {
  const id = req.params.id || req.profileId;
  const currentDate = new Date();
  const page = req.query.page ? parseInt(req.query.page) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const skip = page && limit ? (page - 1) * limit : 0;

  try {
    const query = {
      $or: [{ therapistId: id }, { patientId: id }],
    };

    const appointmentType = req.query.type;

    if (appointmentType === "past") {
      query.appointmentDate = { $lt: currentDate };
    } else if (appointmentType === "completed") {
      query.status = "completed";
    } else if (appointmentType === "upcoming") {
      query.appointmentDate = { $gte: currentDate };
      query.status = { $in: ["requested","scheduled", "rescheduled", "confirmed"] };
    }

    let appointmentsQuery = Appointment.find(query)
      .sort(appointmentType === "past" || appointmentType === "completed" 
        ? { appointmentDate: -1, appointmentTime: -1 } 
        : { appointmentDate: 1, appointmentTime: 1 })
      .populate({
        path: "therapistId",
        select: "_id",
        populate: {
          path: "userId",
          select: "name email profilePicture",
        },
      })
      .populate({
        path: "patientId",
        select: "_id",
        populate: {
          path: "userId",
          select: "name email profilePicture",
        },
      });

    if (page && limit) {
      appointmentsQuery = appointmentsQuery.skip(skip).limit(limit);
    }

    const appointments = await appointmentsQuery.exec();

    if (!appointments || appointments.length === 0) {
      return res.status(404).json({
        message: appointmentType === "past"
          ? "No past appointments found"
          : appointmentType === "completed"
          ? "No completed appointments found"
          : appointmentType === "upcoming"
          ? "No upcoming appointments found"
          : "No appointments found",
      });
    }

    let totalCount = 0;
    if (page && limit) {
      totalCount = await Appointment.countDocuments(query);
    }

    const response = { appointments };
    if (page && limit) {
      response.currentPage = page;
      response.totalPages = Math.ceil(totalCount / limit);
      response.totalAppointments = totalCount;
    }

    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching appointments", error: err.message });
  }
};
const updateTherapistSlot = async (therapistId, appointmentDate, appointmentTime, action) => {
  try {
    const therapist = await TherapistProfile.findById(therapistId);
    if (!therapist) {
      console.error("Therapist not found");
      return false;
    }

    const appointmentDay = getDayOfWeekInTimezone(appointmentDate, therapist.timeZone);
    const consultationDay = therapist.consultationDays.find(day => day.day === appointmentDay);
    if (!consultationDay) {
      console.error(`Therapist is not available on ${appointmentDate} (weekday ${appointmentDay})`);
      return false;
    }

    const slot = consultationDay.slots.find(s => s.start === appointmentTime);
    if (!slot) {
      console.error(`No slot found at ${appointmentTime} on ${appointmentDate}`);
      return false;
    }

    const appointmentDateObj = new Date(appointmentDate);

    if (action === "add") {
      // Check if date already exists in bookedDates for this slot
      const isAlreadyBooked = slot.bookedDates.some(date => date.getTime() === appointmentDateObj.getTime());
      if (isAlreadyBooked) {
        console.error("Requested slot is already booked.");
        return false; // Indicate that the slot is unavailable
      }
      slot.bookedDates.push(appointmentDateObj);
    } else if (action === "remove") {
      slot.bookedDates = slot.bookedDates.filter(date => date.getTime() !== appointmentDateObj.getTime());
    }

    await therapist.save();
    return true; // Slot update was successful
  } catch (error) {
    console.error("Error updating therapist slot:", error.message);
    return false;
  }
};
export const updateAppointment = async (req, res) => {
  const { id } = req.params;
  const { status, appointmentDate, appointmentTime } = req.body;

  try {
    const existingAppointment = await Appointment.findById(id);
    if (!existingAppointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const isStatusUpdate = Boolean(status);
    const isReschedule = status === "rescheduled" && appointmentDate && appointmentTime;

    if (isStatusUpdate) {
      if (status === "completed" || status === "canceled") {
        // Remove the current date from bookedDates
        await updateTherapistSlot(
          existingAppointment.therapistId,
          existingAppointment.appointmentDate,
          existingAppointment.appointmentTime,
          "remove"
        );
      } else if (isReschedule) {
        // Check if the requested slot is available
        const slotAvailable = await updateTherapistSlot(
          existingAppointment.therapistId,
          appointmentDate,
          appointmentTime,
          "add"
        );

        if (!slotAvailable) {
          return res.status(400).json({ message: "The requested slot is already booked." });
        }

        // Remove the old date from bookedDates as the slot has been rescheduled
        await updateTherapistSlot(
          existingAppointment.therapistId,
          existingAppointment.appointmentDate,
          existingAppointment.appointmentTime,
          "remove"
        );
      }
    }

    // Update appointment details
    const updateObject = {
      $set: { ...req.body, updatedAt: new Date() },
    };
    const updatedAppointment = await Appointment.findByIdAndUpdate(id, updateObject, { new: true });

    // Notify users of the update
    await notifyUsers(updatedAppointment, "update");

    return res.status(200).json({
      message: "Appointment updated successfully",
      appointment: updatedAppointment,
    });
  } catch (err) {
    console.error("Error updating appointment:", err.message);
    return res.status(500).json({
      message: "Error updating appointment",
      error: err.message,
    });
  }
};

    



// Delete one or many appointments and associated SOAP notes
export const deleteAppointment = async (req, res) => {
  const { id } = req.params; // For single ID passed in URL
  const { ids } = req.body; // For multiple IDs passed in the query string

  try {
    if (ids) {
      // Handle deleting multiple appointments
      const idArray = ids.split(","); // Split the query string into an array of ids

      // Delete appointments
      const deletedAppointments = await Appointment.deleteMany({
        _id: { $in: idArray },
      });

      if (!deletedAppointments.deletedCount) {
        return res
          .status(404)
          .json({ message: "No appointments found to delete" });
      }

      // Delete associated SOAP notes for the deleted appointments
      await SOAPNotes.deleteMany({ appointmentId: { $in: idArray } });

      return res.status(200).json({
        message: `${deletedAppointments.deletedCount} appointment(s) and their associated SOAP notes deleted successfully`,
      });
    } else if (id) {
      // Handle deleting a single appointment
      const deletedAppointment = await Appointment.findByIdAndDelete(id);

      if (!deletedAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Delete associated SOAP notes for the deleted appointment
      await SOAPNotes.deleteMany({ appointmentId: id });

      return res.status(200).json({
        message: "Appointment and associated SOAP notes deleted successfully",
      });
    } else {
      return res.status(400).json({ message: "No ID provided" });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error deleting appointment(s)", error: err.message });
  }
};

export const deleteAppointmentById = async (appointmentId) => {
  try {
    // Check if the appointment exists before deletion
    const deletedAppointment = await Appointment.findByIdAndDelete(
      appointmentId
    );

    if (!deletedAppointment) {
      return {
        success: false,
        message: "Appointment not found",
      };
    }

    // Delete associated SOAP notes for the deleted appointment
    await SOAPNotes.deleteMany({ appointmentId: appointmentId });

    return {
      success: true,
      message: "Appointment and associated SOAP notes deleted successfully",
    };
  } catch (err) {
    return {
      success: false,
      message: "Error deleting appointment and SOAP notes",
      error: err.message,
    };
  }
};
