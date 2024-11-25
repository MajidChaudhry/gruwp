// services/scheduler.js
import cron from 'node-cron';
import Appointment from '../models/AppointmentModel.js';
import { notifyUsers } from './notificationService.js'; // Import the notification service

// Function to check for upcoming appointments and notify users
const checkUpcomingAppointments = async () => { 
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  try {
    // Query for upcoming appointments within the next hour
    const upcomingAppointments = await Appointment.find({
      date: { $gte: now, $lt: oneHourLater },
      status: { $in: [ 'scheduled', 'rescheduled', 'confirmed'] } // Only notify for confirmed appointments
    });

    // Send notifications for each upcoming appointment
    for (const appointment of upcomingAppointments) {
      await notifyUsers(appointment);
    }

    console.log('Notifications sent for upcoming appointments.');
  } catch (error) {
    console.error('Error checking for upcoming appointments:', error);
  }
};

// Function to update past appointments to "canceled" if they are no longer valid
const cancelPastAppointments = async () => {
  const now = new Date();

  try {
    // Find appointments that are past the current date/time and still "confirmed"
    const pastAppointments = await Appointment.find({
      date: { $lt: now },
      status: { $in: ['requested', 'scheduled', 'rescheduled', 'confirmed'] } // Specific statuses
   });

    // Update each past appointment to "canceled"
    for (const appointment of pastAppointments) {
      appointment.status = 'canceled';
      await appointment.save();
    }

    console.log('Past appointments updated to "canceled" status.');
  } catch (error) {
    console.error('Error updating past appointments:', error);
  }
};

// Schedule a task to check for upcoming appointments every hour
cron.schedule('0 * * * *', () => {
  console.log('Checking for upcoming appointments...');
  checkUpcomingAppointments();
});

// Schedule a task to cancel past appointments every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('Checking for past appointments to cancel...');
  cancelPastAppointments();
});

export default { checkUpcomingAppointments, cancelPastAppointments };
