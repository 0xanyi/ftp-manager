# ToovyDrop - Coolify Deployment Guide

This guide provides step-by-step instructions for deploying ToovyDrop to Coolify, a self-hosted alternative to Heroku/Netlify.

## Prerequisites

- [ ] Coolify instance running and accessible
- [ ] Domain name configured and pointing to your Coolify server
- [ ] Git repository accessible from Coolify
- [ ] FTP server details (external)
- [ ] SSL certificate configured (automatic with Coolify + Let's Encrypt)

## Deployment Architecture

ToovyDrop consists of 2 main application services:
- **Frontend**: React + Vite application (Nginx)
- **Backend**: Node.js + Express API server

Plus external database services:
- **PostgreSQL**: Primary database (external service)
- **Redis**: Cache and session store (external service)

> **📋 Database Options**: This guide covers deployment with external databases. 
> For containerized databases, see the alternative `docker-compose.yml` configuration.
> For detailed external database setup, see `docs/external-database-setup.md`

## Step 1: Prepare Your Repository

### 1.1 Ensure Deployment Files Are Present

Verify these files exist in your repository root:
```
├── docker-compose.coolify.yml     ✅ (External DB configuration)
├── docker-compose.external-db.yml ✅ (Alternative external DB config)
├── .env.coolify                   ✅ (Environment template) 
├── backend/Dockerfile.production  ✅ (Optimized backend)
├── frontend/Dockerfile.production ✅ (Optimized frontend)
├── docs/external-database-setup.md ✅ (Database setup guide)
└── README.md                      ✅ (Exists)
```

### 1.2 Commit and Push Changes

```bash
git add .
git commit -m "feat: add Coolify deployment configuration"
git push origin main
```

## Step 2: Create New Project in Coolify

### 2.1 Access Coolify Dashboard
1. Navigate to your Coolify instance
2. Login with your credentials
3. Click **"New Project"**

### 2.2 Project Configuration
```
Project Name: toovydrop
Description: Web-based file transfer platform
```

## Step 3: Add New Resource

### 3.1 Choose Resource Type
1. Click **"New Resource"**
2. Select **"Docker Compose"**
3. Choose **"From Git Repository"**

### 3.2 Repository Configuration
```
Repository URL: https://github.com/yourusername/ftp-manager
Branch: main
Docker Compose Location: ./docker-compose.coolify.yml
```

### 3.3 Build Configuration
```
Build Pack: Docker Compose
Auto Deploy: Enabled (recommended)
```

## Step 4: Configure Environment Variables

### 4.1 Copy Environment Template
Copy all variables from `.env.coolify` to your Coolify environment configuration.

### 4.2 Critical Variables to Set

**Domain Configuration:**
```bash
SERVICE_FQDN_TOOVYDROP=https://yourdomain.com
```

**JWT Secrets (Generate securely):**
```bash
# Generate with: openssl rand -base64 48
JWT_ACCESS_SECRET=your_secure_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_secure_refresh_secret_min_32_chars
```

**FTP Server Details:**
```bash
FTP_HOST=your-ftp-server.com
FTP_PORT=21
FTP_USER=your_ftp_username
FTP_PASSWORD=your_ftp_password
FTP_SECURE=true
```

> **📋 Database Setup**: Before deploying, ensure your external PostgreSQL and Redis 
> services are configured and accessible. See `docs/external-database-setup.md` for 
> detailed setup instructions including Coolify managed databases, cloud services, 
> or self-hosted options.

## Step 5: Configure Domain and SSL

### 5.1 Domain Setup
1. Go to **"Domains"** tab
2. Add your domain: `yourdomain.com`
3. Enable **"Generate SSL Certificate"** (Let's Encrypt)

### 5.2 DNS Configuration
Ensure your domain's A record points to your Coolify server:
```
A    yourdomain.com    YOUR_SERVER_IP
```

## Step 6: Deploy Application

### 6.1 Initial Deployment
1. Click **"Deploy"** button
2. Monitor deployment logs
3. Wait for all services to be healthy (5-10 minutes)

### 6.2 Service Health Check
Verify all services are running:
- ✅ Frontend (Nginx)
- ✅ Backend (Node.js)
- ✅ PostgreSQL (External service)
- ✅ Redis (External service)

## Step 7: Post-Deployment Configuration

### 7.1 Database Migrations (Automatic)
Database migrations now run automatically during deployment. The backend container will:
1. Run `npx prisma migrate deploy` on startup
2. Apply any pending migrations safely
3. Start the application server

> **Note**: If you need to run migrations manually, you can still access the backend container:
> ```bash
> # Via Coolify terminal or SSH to server
> docker exec -it toovydrop-backend sh
> npx prisma migrate deploy
> ```

### 7.2 Create Admin User
```bash
# In backend container
node dist/scripts/createAdmin.js
```

### 7.3 Verify Application
1. Navigate to `https://yourdomain.com`
2. Test login with admin credentials:
   - Email: `admin@example.com`
   - Password: `AdminPassword123!`

## Step 8: Configure File Storage

### 8.1 Volume Mounts
Coolify automatically creates persistent volumes:
- `backend_uploads`: File uploads storage
- `backend_logs`: Application logs storage

Database storage is managed by your external database services.

### 8.2 FTP Directory Structure
Ensure your FTP server has the proper directory structure:
```
/
├── uploads/
│   ├── temp/          # Temporary upload chunks
│   └── channels/      # Channel-organized files
└── logs/              # Application logs
```

## Step 9: Monitoring and Maintenance

### 9.1 Health Monitoring
Coolify automatically monitors:
- Service health checks
- Resource usage
- SSL certificate expiry

### 9.2 Log Access
Access logs via Coolify dashboard:
- Application logs: Backend service logs
- Database logs: PostgreSQL service logs
- Nginx logs: Frontend service logs

### 9.3 Backup Strategy
Configure automatic backups:
- Database: PostgreSQL dumps
- Files: Upload directory snapshots
- Configuration: Environment variables export

## Troubleshooting

### Common Issues

**1. SSL Certificate Issues**
```bash
# Check certificate status
curl -I https://yourdomain.com
# Regenerate if needed via Coolify dashboard
```

**2. Database Connection Errors**
```bash
# Check PostgreSQL service health
docker logs toovydrop-postgres
# Verify DATABASE_URL format
```

**3. FTP Connection Issues**
```bash
# Test FTP connection from backend
docker exec -it toovydrop-backend sh
curl -v ftp://your-ftp-server.com
```

**4. File Upload Issues**
```bash
# Check upload directory permissions
docker exec -it toovydrop-backend sh
ls -la /app/uploads
```

### Performance Optimization

**1. Resource Limits**
Set appropriate resource limits in Coolify:
```
Frontend: 512MB RAM, 0.5 CPU
Backend: 1GB RAM, 1 CPU  
PostgreSQL: 1GB RAM, 1 CPU
Redis: 256MB RAM, 0.25 CPU
```

**2. Database Optimization**
```sql
-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;
```

## Security Checklist

- [ ] SSL certificate active and valid
- [ ] Strong JWT secrets (min 32 characters)
- [ ] Database passwords are secure
- [ ] FTP credentials are secure
- [ ] Rate limiting enabled
- [ ] CSRF protection active
- [ ] File upload validation working
- [ ] Malware scanning enabled (if configured)

## Production Readiness

### Final Verification Steps
1. [ ] Application loads correctly
2. [ ] User registration/login works
3. [ ] File upload functions properly
4. [ ] Channel management works
5. [ ] Admin panel accessible
6. [ ] Email notifications configured (if applicable)
7. [ ] Backup strategy implemented
8. [ ] Monitoring alerts configured

## Support and Updates

### Updating the Application
1. Push changes to your Git repository
2. Coolify will auto-deploy (if enabled)
3. Monitor deployment in Coolify dashboard
4. Run any necessary migrations

### Getting Help
- Coolify Documentation: https://coolify.io/docs
- ToovyDrop Issues: GitHub repository issues
- Community: Coolify Discord/Forums

---

**Deployment Complete!** 🚀

Your ToovyDrop application should now be running at `https://yourdomain.com` with full functionality, SSL encryption, and automatic backups via Coolify.