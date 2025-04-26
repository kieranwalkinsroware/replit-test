# VOTA App Deployment Guide

This guide explains how to deploy the VOTA application to a production server.

## Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL database
- SendGrid account for email notifications
- Replicate API token for AI video generation

## Step 1: Clone the Repository

```bash
git clone https://github.com/kwalkin/vota-test1.git
cd vota-test1
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Set Up Environment Variables

Create a `.env` file in the project root with the following variables:

```
# Database
DATABASE_URL=postgresql://username:password@hostname:port/database_name

# Replicate AI
REPLICATE_API_TOKEN=your_replicate_token

# SendGrid Email
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender_email
```

## Step 4: Set Up the Database

Run the Drizzle migrations to set up the database schema:

```bash
npm run db:push
```

## Step 5: Build the Application

```bash
npm run build
```

## Step 6: Start the Server

For development:
```bash
npm run dev
```

For production (using PM2 for process management):
```bash
npm install -g pm2
pm2 start npm --name "vota-app" -- start
```

## Step 7: Important Production Settings

1. Turn off development mode by editing `server/routes/debug.ts`:
   ```javascript
   const useDevelopmentMode = false; // Set to false to use real API
   ```

2. Set NODE_ENV to production in your start script or environment:
   ```
   NODE_ENV=production
   ```

## Troubleshooting

1. **API Permissions**: Ensure your Replicate API token has permissions to access the required models.
2. **Database Connection**: Verify your PostgreSQL connection string is correct.
3. **Email Configuration**: Make sure your SendGrid sender email is verified.
4. **Logs**: Check application logs with `pm2 logs vota-app`

## Resources

- [Replicate API Documentation](https://replicate.com/docs)
- [SendGrid Documentation](https://docs.sendgrid.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)