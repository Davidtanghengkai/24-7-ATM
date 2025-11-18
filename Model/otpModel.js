const sql = require('mssql');
const dbConfig = require('../dbConfig');


const generateAndStoreOtp = (session, email) => {
    // 1. Generate a 6-digit OTP
    const otp = Math.floor(0 + Math.random() * 999999).toString();

    session.otp = otp;
    session.email = email;
    session.otp_expires = Date.now() + 15 * 60 * 1000; 
    
    console.log(`[OTP Model] OTP generated and stored for ${email}: ${otp}`);
    

    return otp;
};


const verifyOtp = (session, userOtp) => {
    const { otp: sessionOtp, email, otp_expires } = session;

    console.log(`[OTP Model] Verifying. Session OTP: ${sessionOtp}, User OTP: ${userOtp}`);

    // check expiry
    if (!sessionOtp || !otp_expires || Date.now() > otp_expires) {
        session.destroy(); 
        return { success: false, message: 'OTP expired or not found.' };
    }

    // match OTP
    if (userOtp === sessionOtp) {
        console.log(`[OTP Model] Success for ${email}`);
        session.destroy(); 
        return { success: true, message: 'OTP verified successfully.' };
    } else {
        console.warn(`[OTP Model] Invalid OTP for ${email}`);
        return { success: false, message: 'Invalid OTP.' };
    }
};


module.exports = {
    generateAndStoreOtp,
    verifyOtp
};