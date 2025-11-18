const otpModel = require('../models/otpModel');
const emailService = require('../services/NodeMailer');


const sendOtp = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    try {
        //Generate and store OTP
        const newOtp = otpModel.generateAndStoreOtp(req.session, email);

        //Call service to send the email
        await emailService.sendOtpEmail(email, newOtp);
        
        //Send success response
        res.json({ success: true, message: 'OTP sent successfully.' });

    } catch (error) {
        console.error("[OTP Controller ERROR]", error.message);
        res.status(500).json({ success: false, message: 'Failed to send OTP.' });
    }
};



const verifyOtp = (req, res) => {
    const { otp } = req.body;
    if (!otp) {
        return res.status(400).json({ success: false, message: 'OTP is required.' });
    }

    //Call model to verify OTP
    const result = otpModel.verifyOtp(req.session, otp);

    //Send response based on verification result
    if (result.success) {
        res.json({ success: true, message: result.message });
    } else {
        res.status(400).json({ success: false, message: result.message });
    }
};


module.exports = {
    sendOtp,
    verifyOtp
};