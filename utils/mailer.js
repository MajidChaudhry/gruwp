import nodemailer from 'nodemailer';

// Create a reusable transporter object
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Send mail function using async/await
const sendMail = async (to, subject, text, from = process.env.SMTP_FROM) => {
  try {
    const mailOptions = {
      from,         // Sender address (default set to environment variable)
      to,           // List of receivers
      subject,      // Subject line
      text,         // Plain text body
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;  // Rethrow to handle it later if needed
  }
};

export default sendMail;



