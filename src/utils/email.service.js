import nodemailer from 'nodemailer';

let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const sanitizedPass = process.env.EMAIL_PASS.replace(/\s+/g, '');
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: sanitizedPass },
    });
    console.log('[EMAIL] Using Gmail SMTP:', process.env.EMAIL_USER);
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('[EMAIL] Using Ethereal test account');
  }
  return transporter;
};

const getBaseTemplate = (title, content) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px;">GharSetu</h1>
    </div>
    <div style="padding: 40px 32px;">
      <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 24px; font-size: 22px;">${title}</h2>
      ${content}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
      <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0; line-height: 1.5;">
        This is an automated message from GharSetu. Please do not reply directly to this email.
      </p>
    </div>
  </div>
`;

const sendEmail = async (to, subject, title, content) => {
  const transport = await getTransporter();
  const mailOptions = {
    from: `"GharSetu" <${process.env.EMAIL_USER || 'noreply@gharsetu.com'}>`,
    to,
    subject,
    html: getBaseTemplate(title, content)
  };

  try {
    const info = await transport.sendMail(mailOptions);
    console.log(`[EMAIL] ✅ Email sent to ${to}: ${subject}`);
    return info;
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, err.message);
    // Don't throw to prevent breaking the main app flow
    return null;
  }
};

// ─── Existing OTP Email ───
export const sendOtpEmail = async (toEmail, otp) => {
  const content = `
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
      We received a request to reset your password. Use the verification code below to securely change your password. 
    </p>
    <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <p style="margin: 0; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; margin-bottom: 12px;">Your Verification Code</p>
      <div style="color: #4f46e5; font-size: 42px; font-weight: 800; letter-spacing: 12px; line-height: 1;">
        ${otp}
      </div>
    </div>
    <p style="color: #ef4444; font-size: 14px; font-weight: 600; text-align: center; margin-bottom: 24px;">
      ⏱️ This code will expire in 1 minute.
    </p>
  `;
  return sendEmail(toEmail, 'GharSetu - Your Password Reset OTP', 'Password Reset Request', content);
};

// ─── 1. Provider Registration (To Admin) ───
export const sendProviderRegistrationAdminEmail = async (adminEmail, providerData) => {
  const content = `
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
      A new service provider has registered on the platform and is awaiting your approval.
    </p>
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>Business Name:</strong> ${providerData.businessName}</p>
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>Owner:</strong> ${providerData.ownerName}</p>
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>Email:</strong> ${providerData.email}</p>
      <p style="margin: 0; color: #334155;"><strong>Service Type:</strong> ${providerData.serviceType}</p>
    </div>
    <p style="color: #475569; font-size: 15px;">Please log in to the Admin Dashboard to review and approve/reject this application.</p>
  `;
  return sendEmail(adminEmail, 'Action Required: New Provider Registration', 'New Provider Application', content);
};

// ─── 2. Provider Approval (To Provider) ───
export const sendProviderApprovalEmail = async (providerEmail, providerName) => {
  const loginUrl = process.env.CLIENT_URL || 'http://localhost:5173/login';
  const content = `
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
      Congratulations ${providerName}! Your provider account has been successfully verified and approved by the GharSetu administration team.
    </p>
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">
      You can now log in to your dashboard to complete your profile, add portfolio images, and start receiving service requests from users in your area.
    </p>
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${loginUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Login to Dashboard</a>
    </div>
  `;
  return sendEmail(providerEmail, 'Welcome to GharSetu! Account Approved', 'Account Approved 🎉', content);
};

// ─── 3. Provider Rejection (To Provider) ───
export const sendProviderRejectionEmail = async (providerEmail, providerName, reason) => {
  const content = `
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
      Dear ${providerName},
    </p>
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
      Thank you for your interest in joining GharSetu. After carefully reviewing your application, we regret to inform you that we cannot approve your account at this time.
    </p>
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px 20px; border-radius: 4px 8px 8px 4px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; color: #991b1b; font-weight: 600; font-size: 14px; text-transform: uppercase;">Reason for Rejection:</p>
      <p style="margin: 0; color: #7f1d1d; font-size: 15px;">${reason || 'Does not meet current platform requirements.'}</p>
    </div>
    <p style="color: #475569; font-size: 15px;">If you have any questions or wish to appeal this decision, please reply to this email.</p>
  `;
  return sendEmail(providerEmail, 'Update on your GharSetu Application', 'Application Status Update', content);
};

// ─── 4. User Creates Request (To Admin) ───
export const sendUserRequestAdminEmail = async (adminEmail, requestData) => {
  const content = `
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
      A user has submitted a new service request and is waiting for it to be forwarded to the selected providers.
    </p>
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>User Name:</strong> ${requestData.userName}</p>
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>Requirement:</strong> ${requestData.requirement}</p>
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>Preferred Date:</strong> ${requestData.preferredDate}</p>
      <p style="margin: 0; color: #334155;"><strong>Providers Selected:</strong> ${requestData.providerCount}</p>
    </div>
    <p style="color: #475569; font-size: 15px;">Please log in to the Admin Dashboard to review and forward this request.</p>
  `;
  return sendEmail(adminEmail, 'New User Service Request Submitted', 'New Service Request', content);
};

// ─── 5. Admin Forwards Request (To Providers) ───
export const sendRequestForwardedProviderEmail = async (providerEmail, requestData) => {
  const loginUrl = process.env.CLIENT_URL || 'http://localhost:5173/login';
  const content = `
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
      Hello! A new service request matching your profile has been forwarded to you.
    </p>
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>Requested Requirement:</strong> ${requestData.requirement}</p>
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>Preferred Date:</strong> ${requestData.preferredDate}</p>
    </div>
    <p style="color: #475569; font-size: 15px; margin-bottom: 32px;">Please log in to your dashboard as soon as possible to review the full details and Accept or Reject this request. Note: Requests are assigned on a first-come, first-served basis!</p>
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${loginUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">View Request</a>
    </div>
  `;
  return sendEmail(providerEmail, 'New Service Request Opportunity!', 'New Incoming Request 🚀', content);
};

// ─── 6. Provider Responds (To User and Admin) ───
export const sendProviderResponseEmail = async (toEmail, recipientName, providerName, action, isUser = true) => {
  const actionText = action === 'accept' ? 'accepted' : 'declined';
  const color = action === 'accept' ? '#10b981' : '#f59e0b';
  
  const userMessage = action === 'accept' 
    ? `Great news! <strong>${providerName}</strong> has accepted your service request. The Admin will now schedule a meeting between you shortly.`
    : `<strong>${providerName}</strong> has declined your service request. Don't worry, other providers you selected may still respond.`;
    
  const adminMessage = `<strong>${providerName}</strong> has ${actionText} a pending service request.`;

  const content = `
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
      Hello ${recipientName},
    </p>
    <div style="background: #f8fafc; border-left: 4px solid ${color}; padding: 16px 20px; border-radius: 4px 8px 8px 4px; margin-bottom: 24px;">
      <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6;">
        ${isUser ? userMessage : adminMessage}
      </p>
    </div>
  `;
  return sendEmail(toEmail, `Provider has ${actionText} the request`, 'Request Status Update', content);
};

// ─── 7. Meeting Scheduled (To User and Provider) ───
export const sendMeetingScheduledEmail = async (toEmail, recipientName, meetingData, isProvider = false) => {
  const otherParty = isProvider ? `User: ${meetingData.userName}` : `Provider: ${meetingData.providerName}`;
  const content = `
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
      Hello ${recipientName},
    </p>
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
      A meeting has been successfully scheduled regarding your service request. Please find the details below:
    </p>
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>Date & Time:</strong> ${new Date(meetingData.scheduledAt).toLocaleString()}</p>
      <p style="margin: 0 0 10px 0; color: #334155;"><strong>Meeting With:</strong> ${otherParty}</p>
      <p style="margin: 0; color: #334155;"><strong>Service:</strong> ${meetingData.serviceType}</p>
    </div>
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${meetingData.meetingLink}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Join Google Meet</a>
    </div>
    <p style="color: #475569; font-size: 14px; text-align: center;">Please ensure you join the meeting on time.</p>
  `;
  return sendEmail(toEmail, 'Meeting Scheduled for Service Request', 'Meeting Scheduled 📅', content);
};
