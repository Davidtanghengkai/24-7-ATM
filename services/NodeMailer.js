const nodemailer = require("nodemailer");
require('dotenv').config();

// Create a transporter using Brevo SMTP
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_LOGIN, 
        pass: process.env.EMAIL_PASS 
    }
});

/**
Legend
 * @param {string} to - The recipient's email address.
 * @param {string} otp - The one-time password to send.
 */
const sendOtpEmail = async (to, otp) => {
  
    const mailOptions = {
        from: `"Your App Name" <${process.env.EMAIL_USER}>`, 
        to: to,
        subject: 'Your One-Time Password (OTP)',
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: 333;">
                <h2>Here is your OTP</h2>
                <p>Your One-Time Password is:</p>
                <h1 style="font-size: 48px; letter-spacing: 2px;">${otp}</h1>
                <p>This code will expire in 10 minutes.</p>
            </div>
        `
    };

    // Send the email
    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EmailService] OTP Email sent to ${to}`);
    } catch (error) {
        console.error("[EmailService ERROR]", error);
        // Re-throw the error so the controller can catch it
        throw new Error('Failed to send OTP email.');
    }
};

// Export the function
module.exports = {
    sendOtpEmail
};