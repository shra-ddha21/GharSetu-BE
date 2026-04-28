import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Creates and caches the email transporter.
 * Uses Gmail SMTP if EMAIL_USER and EMAIL_PASS are set in .env,
 * otherwise falls back to Ethereal (test/mock service).
 */
const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // ─── Real Gmail SMTP ───────────────────────────────────
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    console.log('[EMAIL] Using Gmail SMTP:', process.env.EMAIL_USER);
  } else {
    // ─── Ethereal Fallback (dev/testing) ───────────────────
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
    console.log('[EMAIL] Using Ethereal test account:', testAccount.user);
    console.log('[EMAIL] ⚠️  Emails will NOT reach real inboxes. Set EMAIL_USER and EMAIL_PASS in .env for Gmail.');
  }

  return transporter;
};

/**
 * Sends a 4-digit OTP email to the specified address.
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 4-digit OTP string
 * @returns {string|null} Ethereal preview URL (only in dev/Ethereal mode)
 */
export const sendOtpEmail = async (toEmail, otp) => {
  const transport = await getTransporter();

  const mailOptions = {
    from: `"GharSetu" <${process.env.EMAIL_USER || 'noreply@gharsetu.com'}>`,
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

  console.log(`[DEV] OTP for ${toEmail}: ${otp}`);

  // Ethereal provides a preview URL; Gmail does not
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[DEV] Email preview: ${previewUrl}`);
  } else {
    console.log(`[EMAIL] ✅ OTP email sent to ${toEmail}`);
  }

  return previewUrl || null;
};
