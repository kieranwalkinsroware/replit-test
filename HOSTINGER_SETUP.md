# VOTA App Deployment on Hostinger

This guide provides specific instructions for deploying the VOTA application on Hostinger shared hosting or VPS.

## 1. Setting Up Your Hostinger Environment

### Access Your Server

1. **SSH Access**:
   ```bash
   ssh u123456789@your-hostinger-ip-address
   # Or use the credentials provided in Hostinger panel
   ```

2. **Create Application Directory**:
   ```bash
   mkdir -p ~/public_html/vota-app
   cd ~/public_html/vota-app
   ```

### Set Up Node.js

Hostinger provides Node.js through their control panel:

1. Go to **Advanced** > **Node.js** in your hPanel
2. Click **Create a New Node.js Application**
3. Choose Node.js version (14+ recommended)
4. Set the application path to your directory
5. Note the assigned port for your application

### Set Up PostgreSQL Database

1. Go to **Databases** in your hPanel
2. Click **Create a New Database**
3. Note your database name, username, password, and host

## 2. Deploying the Application

### Clone Repository

```bash
cd ~/public_html/vota-app
git clone https://github.com/kwalkin/vota-test1.git .
```

### Set Up Environment Variables

Create a `.env` file with your specific credentials:

```bash
nano .env
```

Add the following content:
```
# Database - use the values from your Hostinger database setup
DATABASE_URL=postgresql://your_db_username:your_db_password@your_db_host:5432/your_db_name

# Replicate AI
REPLICATE_API_TOKEN=your_replicate_token

# SendGrid Email
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=kieran@plexusoft.ie
```

### Install Dependencies and Build

```bash
npm install
npm run build
```

### Set Up Database Schema

```bash
npm run db:push
```

### Update Application Settings for Production

1. Edit `server/routes/debug.ts` to disable development mode:
   ```bash
   nano server/routes/debug.ts
   ```

   Find and change:
   ```javascript
   const useDevelopmentMode = false; // Change to false
   ```

2. Update server port in `server/index.ts` if needed:
   ```bash
   nano server/index.ts
   ```

   Make sure the port matches the one assigned by Hostinger:
   ```javascript
   const PORT = process.env.PORT || 3000; // Change to your Hostinger assigned port
   ```

## 3. Running the Application

### For Development Testing

```bash
npm run dev
```

### For Production (Recommended)

Using PM2 for process management:

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start npm --name "vota-app" -- start

# Make PM2 start on server reboot
pm2 startup
pm2 save

# Monitor your application
pm2 status
pm2 logs vota-app
```

## 4. Setting Up Domain with Nginx (VPS Only)

If you're using a Hostinger VPS and want to use a custom domain:

1. Install Nginx:
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. Create a new Nginx configuration:
   ```bash
   sudo nano /etc/nginx/sites-available/vota-app
   ```

3. Add this configuration (replace with your domain and port):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://localhost:YOUR_NODE_APP_PORT;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. Enable the site and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/vota-app /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. Set up SSL with Let's Encrypt:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

## 5. Troubleshooting

### Application Not Starting
- Check logs: `pm2 logs vota-app`
- Verify environment variables: `cat .env`
- Check port conflicts: `lsof -i :YOUR_PORT`

### Database Connection Issues
- Verify database credentials: `psql -h your_db_host -U your_db_username -d your_db_name`
- Check firewall settings in Hostinger panel

### Email Not Sending
- Verify SendGrid API key is correct and active
- Ensure sender email is verified in SendGrid

## Need Help?

Contact Hostinger support or reference their documentation for specific server configurations.