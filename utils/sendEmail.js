// utils/sendEmail.js
import transporter from '../config/emailConfig.js';

export const sendEmail = async (to, subject, text, html) => {
  try {
    console.log('Attempting to send email to:', to);
    console.log('Using SMTP configuration:', JSON.stringify(transporter.options, null, 2));

    const mailOptions = {
      from: process.env.SENDGRID_USER,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info);
    return info;
  } catch (error) {
    console.error('Detailed error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};