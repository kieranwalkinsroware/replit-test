# VOTA Deployment Checklist

## Pre-Deployment Checks

- [ ] Verify all API keys are valid and have necessary permissions
  - [ ] Replicate API token
  - [ ] SendGrid API key
  - [ ] Fal.ai API key (if used)
- [ ] Set up PostgreSQL database on Hostinger or external service
- [ ] Note down database connection details

## Hostinger Setup

- [ ] Create a Node.js hosting account on Hostinger
- [ ] Set up domain name and DNS records
- [ ] Enable SSH access if available

## Deployment Steps

- [ ] Upload and extract `vota-hostinger-deploy.zip` to Hostinger
- [ ] Update `deploy.sh` with actual environment variables
- [ ] Set appropriate permissions: `chmod +x deploy.sh`
- [ ] Run deployment script: `./deploy.sh`
- [ ] Verify that the application starts successfully

## NGINX Configuration (if applicable)

- [ ] Update `nginx.conf` with your domain name and SSL certificate paths
- [ ] Place configuration in appropriate location (usually `/etc/nginx/sites-available/`)
- [ ] Enable site configuration: `ln -s /etc/nginx/sites-available/vota.conf /etc/nginx/sites-enabled/`
- [ ] Test NGINX configuration: `nginx -t`
- [ ] Restart NGINX: `systemctl restart nginx`

## Post-Deployment Verification

- [ ] Check application logs: `pm2 logs vota-app`
- [ ] Test application by accessing your domain in a web browser
- [ ] Verify all features work as expected:
  - [ ] User registration/login
  - [ ] Video upload
  - [ ] Face extraction
  - [ ] Video generation
  - [ ] Email notifications
  - [ ] Social sharing

## Troubleshooting

- If application fails to start, check PM2 logs: `pm2 logs vota-app`
- If database connection fails, verify DATABASE_URL environment variable
- If email sending fails, verify SendGrid API key and FROM_EMAIL values
- If API calls fail, check corresponding API keys and permissions