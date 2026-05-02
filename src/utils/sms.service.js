import twilio from 'twilio';

let twilioClient = null;

const getTwilioClient = () => {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (accountSid && authToken) {
    twilioClient = twilio(accountSid, authToken);
    console.log('[SMS] Twilio client initialized.');
  } else {
    console.log('[SMS] ⚠️  Twilio credentials missing in .env. Falling back to console-only mock SMS.');
  }

  return twilioClient;
};

/**
 * Sends a 4-digit OTP via real SMS if Twilio is configured, otherwise logs it.
 * @param {string} toPhone - Recipient phone number (e.g., '+919876543210')
 * @param {string} otp - 4-digit OTP string
 */
export const sendPhoneOtp = async (toPhone, otp) => {
  const client = getTwilioClient();
  const messageBody = `GharSetu: Your phone verification code is ${otp}. It will expire in 10 minutes.`;

  console.log(`[DEV SMS MOCK] 📱 Sending to ${toPhone}: ${otp}`);

  if (client) {
    try {
      const fromPhone = process.env.TWILIO_PHONE_NUMBER;
      if (!fromPhone) {
        throw new Error('TWILIO_PHONE_NUMBER is missing in .env');
      }

      console.log(`[SMS] Attempting to send via Twilio to: ${toPhone}`);
      await client.messages.create({
        body: messageBody,
        from: fromPhone,
        to: toPhone
      });
      console.log(`[SMS] ✅ OTP successfully sent via Twilio to ${toPhone}`);
      return true;
    } catch (error) {
      console.error('[SMS ERROR] Failed to send SMS via Twilio:', error.message);
      // We do not throw here, allowing the fallback console mock to serve development purposes
      return false;
    }
  }

  // Fallback (for development without Twilio credentials)
  console.log(`[SMS] ⚠️  Twilio not configured. OTP generated but not delivered via real SMS network.`);
  return true;
};
