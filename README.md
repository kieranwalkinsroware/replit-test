# VOTA App Deployment Guide

This guide will help you deploy the VOTA application on your Hostinger hosting account.

## Prerequisites

Before deploying, ensure you have:

1. A Hostinger hosting account with Node.js support
2. PostgreSQL database set up (can be set up via Hostinger or externally)
3. SendGrid account for email notifications
4. Replicate API token for AI video generation

## Deployment Steps

1. **Upload Files**:
   - Upload all the files in this folder to your Hostinger hosting account via FTP or Hostinger File Manager

2. **Configure Environment Variables**:
   - Edit the `deploy.sh` script to include your actual environment variables:
     - `DATABASE_URL`: Your PostgreSQL connection string
     - `REPLICATE_API_TOKEN`: Your Replicate API token
     - `SENDGRID_API_KEY`: Your SendGrid API key
     - `SENDGRID_FROM_EMAIL`: The email address to send notifications from

3. **Run Database Migrations**:
   - Install drizzle-kit: `npm install -g drizzle-kit`
   - Run the migration: `drizzle-kit push:pg`

4. **Start the Application**:
   - Make the deploy script executable: `chmod +x deploy.sh`
   - Run the deployment script: `./deploy.sh`

5. **Verify Deployment**:
   - Check the application logs: `pm2 logs vota-app`
   - Access your application through your domain name

## Troubleshooting

If you encounter any issues:

1. Check the application logs: `pm2 logs vota-app`
2. Ensure all environment variables are correctly set
3. Verify database connection is successful
4. Check if your Replicate API token has the necessary permissions

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Hostinger Node.js Hosting Guide](https://www.hostinger.com/tutorials/how-to-host-node-js-application-with-pm2-and-nginx)
- [SendGrid Documentation](https://docs.sendgrid.com/for-developers/sending-email)
- [Replicate API Documentation](https://replicate.com/docs)