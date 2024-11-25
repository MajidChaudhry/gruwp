import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import {connectDB} from './config/dbConfig.js';
       
// Load environment variables
dotenv.config();
const app = express();
connectDB() //db connection

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: '*', // Allow all origins
  credentials: true, // Enable cookies for cross-origin requests
}));


// Import Routes
import authRoutes from './routes/authRoutes.js';
import therapistProfileRoutes from './routes/therapistProfileRoutes.js';
import patientProfileRoutes from './routes/patientProfileRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import soapNotesRoutes from './routes/soapNotesRoutes.js';
import therapyGoalRoutes from './routes/therapyGoalRoutes.js';
import resourcesRoutes from './routes/resourcesRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import logRoutes from './routes/logRoutes.js'; // New log routes
import chatRoutes from './routes/chatRoutes.js';
import callRoutes from './routes/callRoutes.js';

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/call', callRoutes);
app.use('/api/therapists', therapistProfileRoutes);
app.use('/api/patients', patientProfileRoutes);  // Therapist's patients
app.use('/api/appointments', appointmentRoutes);
app.use('/api/soapnotes', soapNotesRoutes);
app.use('/api/therapy-goals', therapyGoalRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/logs', logRoutes); // New log route
app.use('/api/chats', chatRoutes);
// Root Route
app.get('/', (req, res) => {
    res.send('Backend is running...');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server
const PORT = process.env.PORT || 8080 ;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
