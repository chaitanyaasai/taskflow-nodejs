const { generateOTP, hashOTP } = require("../utils/otp");

function createOTP() {
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    // OTP expires after 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    return {
        otp,
        otpHash,
        expiresAt
    };
}

module.exports = { createOTP };