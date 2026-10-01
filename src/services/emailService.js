// const transporter = require("../config/email");

// async function sendTestEmail(toEmail) {
//   const mailOptions = {
//     from: process.env.GMAIL_USER,
//     to: toEmail,
//     subject: "TaskFlow SMTP Test",
//     text: "Congratulations! Your TaskFlow email service is working.",
//   };

//   const info = await transporter.sendMail(mailOptions);

//   return info;
// }

// module.exports = {
//   sendTestEmail,
// };

const transporter = require("../config/email");

async function sendTestEmail(toEmail, otp) {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: "TaskFlow - Email Verification",
    text: `Your TaskFlow verification code is ${otp}. It expires in 10 minutes. If you did not request this code, please ignore this email.`,
    html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
                <h2>Welcome to TaskFlow!</h2>
                <p>Use the following verification code to activate your account:</p>
                <h1 style="letter-spacing: 6px;">${otp}</h1>
                <p>This code expires in 10 minutes.</p>
                <p>If you did not request this code, please ignore this email.</p>
            </div>
        `,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendTestEmail };
