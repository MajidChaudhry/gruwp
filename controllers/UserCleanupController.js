
import {deleteUserByProfileId   } from './authController.js';
import { deleteAppointmentById } from "./appointmentController.js";
import { deleteRecordsById } from "./logEntryController.js";
import { deleteAllNotifications } from "./notificationController.js";
import { deleteResources } from "./resourcesController.js";
import { deleteTherapyGoals } from "./therapyGoalController.js";

async function deleteUserData(userId) {
    // Track each deletion promise
    const deletionTasks = [
        deleteAppointmentById(userId),
        deleteRecordsById(userId),
        deleteAllNotifications(userId),
        deleteResources(userId),
        deleteTherapyGoals(userId),
        deleteUserByProfileId(userId)
    ];

    try {
        // Run all deletions concurrently and wait for them all to complete
        await Promise.all(deletionTasks);
        console.log(`All data for user ${userId} successfully deleted.`);
    } catch (error) {
        console.error("Failed to delete all user data, rolling back:", error);
        // Optionally handle specific rollback logic if necessary
        throw new Error(`Deletion failed for user ${userId}, no data was removed.`);
    }
}

export default deleteUserData;
