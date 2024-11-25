import { pusher } from '../config/pusher.js';
import { createNotification } from '../controllers/notificationController.js';

export const notifyUsers = async (appointment, notificationType = 'reminder') => {
  const { therapistId, patientId, appointmentDate, appointmentTime } = appointment;

  let therapistMessage;
  let patientMessage;

  // Define messages based on the notification type (creation, update, reminder)
  switch (notificationType) {
    case 'creation':
      therapistMessage = `You have a new appointment on ${appointmentDate} at ${appointmentTime}.`;
      patientMessage = `Your appointment is scheduled on ${appointmentDate} at ${appointmentTime}.`;
      break;
    case 'update':
      therapistMessage = `Your appointment on ${appointmentDate} at ${appointmentTime} has been updated.`;
      patientMessage = `Your appointment on ${appointmentDate} at ${appointmentTime} has been updated.`;
      break;
    case 'reminder':
    default:
      therapistMessage = `Reminder: You have an appointment on ${appointmentDate} at ${appointmentTime}.`;
      patientMessage = `Reminder: Your appointment is on ${appointmentDate} at ${appointmentTime}.`;
      break;
  }

  // Save notifications in the database for both therapist and patient
  await createNotification(therapistId, 'appointment', therapistMessage, appointment._id);
  await createNotification(patientId, 'appointment', patientMessage, appointment._id);

  // Broadcast notifications to Pusher channels for therapist and patient
  pusher.trigger(`therapist-${therapistId}`, 'notification', {
    type: notificationType,
    message: therapistMessage,
    referenceId: appointment._id,
  });

  pusher.trigger(`patient-${patientId}`, 'notification', {
    type: notificationType,
    message: patientMessage,
    referenceId: appointment._id,
  });
};
