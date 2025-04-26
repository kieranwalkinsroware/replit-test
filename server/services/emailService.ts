import { MailService, MailDataRequired } from '@sendgrid/mail';
import { type User, type Video } from '@shared/schema';

interface EmailParams {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
}

interface TrainingSession {
  id: number;
  updatedAt?: string;
}

export class EmailService {
  private mailService: MailService;
  private fromEmail: string;
  private isConfigured: boolean;

  constructor() {
    this.mailService = new MailService();
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'notifications@vota-ai.com';
    this.isConfigured = false;
    
    try {
      if (process.env.SENDGRID_API_KEY) {
        this.mailService.setApiKey(process.env.SENDGRID_API_KEY);
        this.isConfigured = true;
        console.log('SendGrid email service configured successfully with from email:', this.fromEmail);
      } else {
        console.warn('SENDGRID_API_KEY environment variable not set, email notifications are disabled');
      }
    } catch (error) {
      console.error('Failed to initialize SendGrid email service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Sends an email using SendGrid
   * @param params Email parameters including to, from, subject, text and html
   * @returns Promise resolving to true if sent successfully, false otherwise
   */
  async sendEmail(params: EmailParams): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('Attempted to send email but SendGrid is not configured');
      return false;
    }

    try {
      // Ensure fromEmail is a string by using the fallback
      const fromEmail: string = params.from || this.fromEmail;
      
      // Create the mail data object according to SendGrid requirements
      // SendGrid requires at least one content type (text or html)
      const mailData: MailDataRequired = {
        to: params.to,
        from: fromEmail,
        subject: params.subject,
        content: [
          {
            type: params.html ? 'text/html' : 'text/plain',
            value: params.html || params.text || ''
          }
        ]
      };
      
      await this.mailService.send(mailData);
      console.log(`Email sent successfully to ${params.to}`);
      return true;
    } catch (error) {
      console.error('SendGrid email error:', error);
      return false;
    }
  }

  /**
   * Sends a notification when face extraction is complete
   * @param user User who initiated the face extraction
   * @param uploadId The ID of the completed upload
   * @returns Promise resolving to true if sent successfully, false otherwise
   */
  async sendFaceExtractionCompleteNotification(
    user: User,
    uploadId: number
  ): Promise<boolean> {
    if (!user.email) {
      console.warn(`Cannot send face extraction completion email: User ${user.id} has no email address`);
      return false;
    }

    const subject = 'Your Face Extraction is Complete!';
    const text = `
      Great news! VOTA has successfully extracted your face from the uploaded video. 
      You can now create personalized AI videos featuring yourself.
      
      Log in to your account to start generating amazing videos!
      
      Best,
      The VOTA Team
    `;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1; text-align: center; margin-bottom: 24px;">Face Extraction Complete!</h1>
        
        <p>Great news! VOTA has successfully extracted your face from the uploaded video.</p>
        <p>You can now create personalized AI videos featuring yourself.</p>
        
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; font-weight: bold;">Upload ID: ${uploadId}</p>
          <p style="margin: 8px 0 0;">Completed on: ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.PUBLIC_URL || 'https://vota-ai.com'}/interact" 
             style="background-color: #6366f1; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">
            Create AI Videos Now
          </a>
        </div>
        
        <p>Best,<br>The VOTA Team</p>
      </div>
    `;

    return await this.sendEmail({
      to: user.email,
      from: this.fromEmail,
      subject,
      text,
      html,
    });
  }

  /**
   * Sends a notification when a video generation is complete
   * @param user User who initiated the video generation
   * @param video The completed video
   * @returns Promise resolving to true if sent successfully, false otherwise
   */
  async sendVideoGenerationCompleteNotification(
    user: User,
    video: Video
  ): Promise<boolean> {
    // Use the notification email from the video first, if available, otherwise fall back to user email
    const emailToNotify = video.notificationEmail || user.email;
    
    if (!emailToNotify) {
      console.warn(`Cannot send video generation completion email: No email address found for video ${video.id}`);
      return false;
    }

    const subject = 'Your AI Video is Ready!';
    const text = `
      Great news! Your VOTA AI video "${video.title}" is now ready to view.
      
      Log in to your account to watch your video and share it with friends.
      
      Best,
      The VOTA Team
    `;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1; text-align: center; margin-bottom: 24px;">Your AI Video is Ready!</h1>
        
        <p>Great news! Your VOTA AI video is now ready to view.</p>
        
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; font-weight: bold;">Video: ${video.title}</p>
          <p style="margin: 8px 0 0;">Created on: ${new Date(video.createdAt || '').toLocaleString()}</p>
          ${video.prompt ? `<p style="margin: 8px 0 0; font-style: italic;">"${video.prompt}"</p>` : ''}
        </div>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.PUBLIC_URL || 'https://vota-ai.com'}/videos/${video.id}" 
             style="background-color: #6366f1; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">
            Watch Your Video
          </a>
        </div>
        
        <p>Best,<br>The VOTA Team</p>
      </div>
    `;

    return await this.sendEmail({
      to: emailToNotify,
      from: this.fromEmail,
      subject,
      text,
      html,
    });
  }
}

export const emailService = new EmailService();