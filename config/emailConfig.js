// config/emailConfig.js
import nodemailer from 'nodemailer';
import 'dotenv/config';

const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false, // Adjust if using a secure port like 465
    auth: {
        user: 'apikey',
        // Use the app-specific password instead of your regular password
        pass: process.env.SENDGRID_API_KEY
    },
    tls: {
        rejectUnauthorized: false // Accept self-signed certificate (NOT recommended in production)
    }
});

export default transporter;