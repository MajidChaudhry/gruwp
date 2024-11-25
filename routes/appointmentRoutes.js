import express from "express";
import {
  createAppointment,
  getAppointmentById,
  getAppointments,
  updateAppointment,
  deleteAppointment,
} from "../controllers/appointmentController.js";
import protect  from "../middlewares/authMiddleware.js"; // Middleware for authentication

const router = express.Router();

// Create a new appointment
router.post("/", protect, createAppointment);

// Get a specific appointment by ID
router.get("/:id", protect, getAppointmentById);

// Get all appointments for a  profile by its ID
router.get("/profile/:id", protect, getAppointments);

// Get all appointments for a login profile
router.get("/", protect, getAppointments);

// Update an appointment
router.put("/:id", protect, updateAppointment);

// Delete an appointment
router.delete("/:id?", protect, deleteAppointment); //if you not provide id you need provide ids array which you want to delete means many. if you want delete one then pass id

export default router;
