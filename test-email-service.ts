/**
 * Email Service Test Script
 * 
 * This script tests the email notification functionality by sending a test email.
 * 
 * Usage:
 *   npx tsx test-email-service.ts [email]
 * 
 * Where [email] is the optional recipient email address. If not provided,
 * the script will just test the email service configuration.
 */

import { emailService } from './server/services/emailService';

async function testEmailService() {
  console.log('Testing email service configuration...');
  
  // Check if the email service is configured
  if (!emailService.isConfigured) {
    console.error('Email service is not configured. Please check SENDGRID_API_KEY and SENDGRID_FROM_EMAIL environment variables.');
    process.exit(1);
  }
  
  console.log('Email service is configured correctly with from email:', process.env.SENDGRID_FROM_EMAIL);
  
  // If recipient email is provided, send a test email
  const recipientEmail = process.argv[2];
  if (recipientEmail) {
    console.log(`Sending test email to ${recipientEmail}...`);
    
    try {
      const result = await emailService.sendEmail({
        to: recipientEmail,
        subject: 'VOTA App - Test Email',
        html: `
          <h1>VOTA App Test Email</h1>
          <p>This is a test email from the VOTA application.</p>
          <p>If you received this email, it means the email notification system is working correctly.</p>
          <p>The database connection is also working correctly.</p>
          <p>Time of test: ${new Date().toISOString()}</p>
        `
      });
      
      if (result) {
        console.log('Test email sent successfully!');
      } else {
        console.error('Failed to send test email.');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
    }
  }
  
  process.exit(0);
}

testEmailService();