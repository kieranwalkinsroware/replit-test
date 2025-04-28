#!/bin/bash

# Deployment script for VOTA app on Hostinger
echo "Starting VOTA application deployment..."

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Installing PM2 globally..."
    npm install -g pm2
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Check for drizzle-kit and install if not present
if ! command -v drizzle-kit &> /dev/null; then
    echo "drizzle-kit is not installed. Installing drizzle-kit globally..."
    npm install -g drizzle-kit
fi

# Set environment variables (make sure these match your Hostinger environment)
export NODE_ENV=production
export PORT=3000

# IMPORTANT: Update these variables with your actual values
export DATABASE_URL="your_database_url"  # PostgreSQL connection string
export REPLICATE_API_TOKEN="your_replicate_token"  # From replicate.com
export SENDGRID_API_KEY="your_sendgrid_key"  # From sendgrid.com
export SENDGRID_FROM_EMAIL="your_email@example.com"  # Email to send notifications from
export FAL_KEY="your_fal_key"  # If using Fal.ai

# Run database migrations
echo "Running database migrations..."
drizzle-kit push:pg

# Create a PM2 ecosystem file for better environment variable management
echo "Creating PM2 ecosystem file..."
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: "vota-app",
    script: "npm",
    args: "start",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      DATABASE_URL: "${DATABASE_URL}",
      REPLICATE_API_TOKEN: "${REPLICATE_API_TOKEN}",
      SENDGRID_API_KEY: "${SENDGRID_API_KEY}",
      SENDGRID_FROM_EMAIL: "${SENDGRID_FROM_EMAIL}",
      FAL_KEY: "${FAL_KEY}"
    }
  }]
}
EOL

# Start the application using PM2
echo "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration to resurrect on server restart
pm2 save

# Setup PM2 to start on system boot (may require sudo on some systems)
echo "Setting up PM2 to start on system boot..."
pm2 startup

echo "Deployment complete! Application is running."
echo "Monitor logs with: pm2 logs vota-app"
echo "View application status: pm2 status"
echo "To stop the application: pm2 stop vota-app"
echo "To restart the application: pm2 restart vota-app"