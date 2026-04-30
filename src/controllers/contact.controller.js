import { sendContactEmail } from '../utils/email.service.js';

export const submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    await sendContactEmail(name, email, subject, message);

    res.status(200).json({ message: 'Contact message sent successfully' });
  } catch (error) {
    console.error('Contact Form Error:', error);
    res.status(500).json({ message: 'Failed to send message. Please try again later.' });
  }
};
