const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Configure email transporter
// In production, use environment variables for SMTP settings
const getTransporter = () => {
  // Check if SMTP settings are configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  // Fallback: Log emails to console in development
  return {
    sendMail: async (mailOptions) => {
      console.log('=== EMAIL (dev mode - not actually sent) ===');
      console.log('To:', mailOptions.to);
      console.log('Subject:', mailOptions.subject);
      console.log('Body:', mailOptions.html || mailOptions.text);
      console.log('==========================================');
      return { messageId: 'dev-' + Date.now() };
    }
  };
};

// Email recipient for contact forms
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'info@reviewhelp.uk';

/**
 * POST /api/contact
 * General contact form submission
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          name: !name ? 'Name is required' : null,
          email: !email ? 'Email is required' : null,
          message: !message ? 'Message is required' : null,
        }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const transporter = getTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Review-Help Contact" <noreply@reviewhelp.uk>',
      to: CONTACT_EMAIL,
      replyTo: email,
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Message:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 10px;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <hr style="margin-top: 20px;">
        <p style="color: #666; font-size: 12px;">
          Sent from Review-Help contact form on ${new Date().toLocaleString()}
        </p>
      `,
      text: `
New Contact Form Submission

From: ${name}
Email: ${email}

Message:
${message}

---
Sent from Review-Help contact form on ${new Date().toLocaleString()}
      `
    };

    await transporter.sendMail(mailOptions);

    console.log(`Contact form submitted: ${name} <${email}>`);
    
    res.json({ 
      success: true, 
      message: 'Your message has been sent successfully. We will get back to you within 24 hours.' 
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      error: 'Failed to send message. Please try again or contact us directly at ' + CONTACT_EMAIL 
    });
  }
});

/**
 * POST /api/contact/enterprise
 * Enterprise plan inquiry submission
 */
router.post('/enterprise', async (req, res) => {
  try {
    const { 
      contactName, 
      email, 
      phone,
      businessName, 
      businessType,
      numberOfLocations, 
      currentReviewVolume,
      reviewPlatforms,
      message 
    } = req.body;

    // Validate required fields
    const requiredFields = { contactName, email, businessName };
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: missingFields.reduce((acc, field) => {
          acc[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`;
          return acc;
        }, {})
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const transporter = getTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Review-Help Enterprise" <noreply@reviewhelp.uk>',
      to: CONTACT_EMAIL,
      replyTo: email,
      subject: `🏢 Enterprise Inquiry from ${businessName}`,
      html: `
        <h2>🏢 New Enterprise Plan Inquiry</h2>
        
        <h3>Contact Information</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; width: 150px;"><strong>Contact Name:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${contactName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Email:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          ${phone ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Phone:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;"><a href="tel:${phone}">${phone}</a></td>
          </tr>
          ` : ''}
        </table>

        <h3>Business Information</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; width: 150px;"><strong>Business Name:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${businessName}</td>
          </tr>
          ${businessType ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Business Type:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${businessType}</td>
          </tr>
          ` : ''}
          ${numberOfLocations ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Number of Locations:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${numberOfLocations}</td>
          </tr>
          ` : ''}
          ${currentReviewVolume ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Current Review Volume:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${currentReviewVolume}</td>
          </tr>
          ` : ''}
          ${reviewPlatforms ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Review Platforms:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${Array.isArray(reviewPlatforms) ? reviewPlatforms.join(', ') : reviewPlatforms}</td>
          </tr>
          ` : ''}
        </table>

        ${message ? `
        <h3>Additional Message</h3>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        ` : ''}

        <hr style="margin-top: 20px;">
        <p style="color: #666; font-size: 12px;">
          Enterprise inquiry received on ${new Date().toLocaleString()}
        </p>
      `,
      text: `
New Enterprise Plan Inquiry

CONTACT INFORMATION
-------------------
Contact Name: ${contactName}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}

BUSINESS INFORMATION
--------------------
Business Name: ${businessName}
${businessType ? `Business Type: ${businessType}` : ''}
${numberOfLocations ? `Number of Locations: ${numberOfLocations}` : ''}
${currentReviewVolume ? `Current Review Volume: ${currentReviewVolume}` : ''}
${reviewPlatforms ? `Review Platforms: ${Array.isArray(reviewPlatforms) ? reviewPlatforms.join(', ') : reviewPlatforms}` : ''}

${message ? `ADDITIONAL MESSAGE
------------------
${message}` : ''}

---
Enterprise inquiry received on ${new Date().toLocaleString()}
      `
    };

    await transporter.sendMail(mailOptions);

    console.log(`Enterprise inquiry submitted: ${businessName} - ${contactName} <${email}>`);
    
    res.json({ 
      success: true, 
      message: 'Thank you for your interest in our Enterprise plan! Our team will contact you within 24 hours to discuss your needs.' 
    });

  } catch (error) {
    console.error('Enterprise inquiry error:', error);
    res.status(500).json({ 
      error: 'Failed to submit inquiry. Please try again or contact us directly at ' + CONTACT_EMAIL 
    });
  }
});

module.exports = router;
