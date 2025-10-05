# Admin User Setup Guide

This guide explains how to create and manage admin users for the FTP Manager system.

## Overview

The FTP Manager uses a role-based access control system with two main roles:
- **ADMIN**: Full administrative access to all system features
- **CHANNEL_USER**: Limited access to assigned channels only

## Creating the Initial Admin User

### Method 1: Using the Interactive Script (Recommended)

Run the interactive admin creation script:

```bash
cd backend
npm run create-admin
```

Follow the prompts to enter:
- Admin email address
- Admin password (must meet security requirements)

### Method 2: Using the Test Script (For Development)

For quick testing, you can use the test admin script:

```bash
cd backend
npx ts-node src/scripts/createTestAdmin.ts
```

This creates a test admin with:
- **Email**: `admin@example.com`
- **Password**: `AdminPassword123!`

⚠️ **Warning**: Only use the test script in development environments.

## Password Requirements

All passwords must meet the following security requirements:
- Minimum 8 characters long
- At least one lowercase letter
- At least one uppercase letter  
- At least one number
- At least one special character (@$!%*?&)

## Creating Additional Admin Users

Once you have an initial admin account, you can create additional admin users through:

### API Method

Use the admin-only endpoint:

```bash
# First, login as an admin to get a token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "AdminPassword123!"}'

# Then use the token to create another admin
curl -X POST http://localhost:3000/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"email": "newadmin@example.com", "password": "AdminPassword123!"}'
```

### Frontend Method (Future)

The admin dashboard (Phase 5) will provide a UI for managing admin users.

## Admin Privileges

Admin users can:
- Create and manage channels
- Create and manage user accounts
- Create guest upload links
- Access all files across all channels
- View system analytics and logs
- Configure system settings

## Security Best Practices

1. **Use Strong Passwords**: Always use passwords that meet the security requirements
2. **Limit Admin Accounts**: Create admin accounts only for users who need full system access
3. **Regular Access Review**: Periodically review who has admin access
4. **Secure Storage**: Store admin credentials securely
5. **Two-Factor Authentication**: Consider implementing 2FA for admin accounts (future enhancement)

## Troubleshooting

### Admin Creation Fails

If admin creation fails, check:
1. Database connection is working
2. Email address isn't already in use
3. Password meets security requirements
4. You have sufficient permissions (for creating additional admins)

### Login Issues

If login fails, verify:
1. Email address is correct
2. Password is correct
3. User account is active
4. User role is correct

### Database Issues

If you encounter database issues:
1. Ensure database migrations are up to date: `npm run prisma:migrate`
2. Check database connection in `.env` file
3. Verify database server is running

## API Endpoints

### Authentication Endpoints
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh access token

### Admin-Only Endpoints
- `POST /api/auth/create-admin` - Create new admin user (admin only)

## Next Steps

After setting up admin users:
1. Log in to the admin panel
2. Create channels for different content types
3. Create user accounts for content contributors
4. Set up guest upload links for external contributors
5. Configure FTP server settings

For more information, see the [Implementation Roadmap](implementation-roadmap.md).
