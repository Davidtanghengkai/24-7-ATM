const userModel = require('../models/userModel');
const cardModel = require('../models/cardModel');

// This is the main logic from server.js, now moved here
const sendOtp = async (req, res) => {
    // 1. Get the email from the frontend
    const { email } = req.body;
    if (!email) {
        return res.status(400).send({ success: false, message: 'Email is required.' });
    }

    try {
        const user = await userModel.findUserByEmail(email);
        if (!user) {
            return res.status(404).send({ success: false, message: 'Email not registered.' });
        }
        
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiryTime = new Date(new Date().getTime() + 5 * 60000); // 5 minutes

        const card = await cardModel.findActiveCardByUserId(user.userId);
        if (!card) {
            return res.status(404).send({ success: false, message: 'No active card found for this user.' });
        }

        await cardModel.updateCardOtp(card.cardNo, otp, expiryTime);

        console.log(`✅ OTP for ${email} is ${otp} (for card ${card.cardNo})`);
        

        res.status(200).send({ success: true, message: 'OTP has been sent to your email.' });

    } catch (err) {
        console.error('Error in sendOtp controller:', err);
        res.status(500).send({ success: false, message: 'Internal server error.' });
    }
};

module.exports = {
    sendOtp
};