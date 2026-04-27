import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Creates and caches an Ethereal test transporter.
 * In production, swap to real SMTP via .env variables.
 */
const getTransporter = async () => {
  if (transporter) return transporter;

  // Create Ethereal test account
  const testAccount = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.log('[EMAIL] Ethereal test account created:', testAccount.user);
  return transporter;
};

/**
 * Sends a 4-digit OTP email using Ethereal (dev) or real SMTP (prod).
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 4-digit OTP string
 * @returns {string} Ethereal preview URL (dev only)
 */
export const sendOtpEmail = async (toEmail, otp) => {
  const transport = await getTransporter();

  const mailOptions = {
    from: '"GharSetu" <noreply@gharsetu.com>',
    to: toEmail,
    subject: 'GharSetu - Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
        <h2 style="color: #1e293b; margin-bottom: 8px;">Password Reset</h2>
        <p style="color: #64748b; font-size: 14px;">Use the following OTP to reset your password. This code expires in <strong>30 seconds</strong>.</p>
        <div style="background: #4f46e5; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 12px; margin: 24px 0;">
          ${otp}
        </div>
        <p style="color: #94a3b8; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  const info = await transport.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);

  console.log(`[DEV] OTP for ${toEmail}: ${otp}`);
  console.log(`[DEV] Email preview: ${previewUrl}`);

  return previewUrl;
};
