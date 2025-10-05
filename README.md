# FTP File Manager - Project Overview

## Introduction

The FTP File Manager is a web-based application designed to enable content contributors to upload files to an FTP server without needing to install FTP client software. The system provides channel-based organization, allowing different content channels (like "love" or "jammy") to have their own dedicated folders on the FTP server.

## Key Features

- **Web-based File Upload**: No FTP client required - users can upload files through a simple web interface
- **Channel-based Organization**: Files are automatically organized into channel-specific folders
- **Large File Support**: Handles files up to 5GB with chunked uploads and progress tracking
- **User Management**: Admin interface for creating and managing channel user accounts
- **Full File Management**: Upload, download, preview, and delete capabilities
- **Real-time Progress Tracking**: WebSocket-based upload progress updates
- **Responsive Design**: Works on desktop and mobile devices
- **Admin Dashboard**: Comprehensive admin interface for system management

## Technology Stack

### Backend
- **Node.js with Express.js**: Modern, lightweight server framework
- **TypeScript**: Type-safe development
- **PostgreSQL**: Robust relational database
- **Prisma**: Modern ORM for database management
- **Redis**: Caching and session storage
- **basic-ftp**: FTP client library
- **JWT & bcrypt**: Authentication and password security

### Frontend
- **React with TypeScript**: Modern component-based UI framework
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **React Query**: Server state management
- **React Dropzone**: Drag-and-drop file upload interface

### Infrastructure
- **Docker**: Containerized application
- **Coolify**: Deployment platform
- **Nginx**: Reverse proxy and static file serving

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   FTP Server    │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Storage)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  PostgreSQL DB  │
                       │   (Metadata)    │
                       └─────────────────┘
```

## Project Structure

```
ftp-manager/
├── backend/                 # Node.js backend application
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── services/        # Business logic services
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── models/          # Database models
│   │   └── utils/           # Utility functions
│   ├── prisma/              # Database schema and migrations
│   ├── tests/               # Backend tests
│   └── Dockerfile
├── frontend/                # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API services
│   │   ├── utils/           # Utility functions
│   │   └── styles/          # Style files
│   ├── public/              # Static assets
│   └── Dockerfile
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
├── docker-compose.yml       # Development environment
└── README.md
```

## Documentation

The following documentation files provide detailed information about the system design and implementation:

1. **[architecture.md](./architecture.md)** - System architecture and technology stack
2. **[database-schema.md](./database-schema.md)** - Database design and schema
3. **[api-design.md](./api-design.md)** - API endpoints and authentication flow
4. **[frontend-design.md](./frontend-design.md)** - Frontend interface design and user flow
5. **[file-upload-design.md](./file-upload-design.md)** - Large file upload handling
6. **[ftp-integration.md](./ftp-integration.md)** - FTP integration and file synchronization
7. **[admin-interface-design.md](./admin-interface-design.md)** - Admin interface design
8. **[security-design.md](./security-design.md)** - Security measures and access controls
9. **[deployment-strategy.md](./deployment-strategy.md)** - Deployment and environment configuration
10. **[implementation-roadmap.md](./implementation-roadmap.md)** - Implementation phases and timeline

## User Roles

### Channel Users
- Can only access assigned channels
- Can upload, download, preview, and delete files in their channels
- Have no administrative privileges

### Administrators
- Can create and manage channels
- Can create and manage user accounts
- Can assign users to channels
- Have full system access and configuration capabilities

## File Upload Process

1. **User Authentication**: Users log in with their credentials
2. **Channel Selection**: Users select their assigned channel
3. **File Upload**: Files are uploaded using chunked transfer for large files
4. **Progress Tracking**: Real-time progress updates via WebSocket
5. **FTP Transfer**: Files are transferred to the appropriate channel folder
6. **Database Update**: File metadata is stored in the database

## Security Features

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Input validation and sanitization
- File type and size validation
- Rate limiting for API endpoints
- Secure FTP connection management
- Audit logging for all actions
- Security headers and HTTPS enforcement

## Deployment

The application is designed for deployment on Coolify with the following characteristics:

- Containerized with Docker
- No SSH access required for management
- Automated CI/CD pipeline
- Health checks and monitoring
- Backup and recovery strategies
- Environment-specific configurations

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker and Docker Compose
- FTP server access

### Development Setup

1. Clone the repository
2. Copy `.env.example` to `.env.development` and configure
3. Start development environment: `docker-compose -f docker-compose.dev.yml up -d`
4. Install dependencies: `npm install` in both backend and frontend
5. Run database migrations: `cd backend && npm run migrate`
6. Start development servers: `npm run dev`

### Production Deployment

1. Configure environment variables for production
2. Build Docker images
3. Deploy to Coolify using the provided configuration
4. Run database migrations
5. Configure SSL certificates
6. Set up monitoring and backups

## Implementation Timeline

The project is planned for implementation over 14 weeks in 7 phases:

1. **Weeks 1-2**: Foundation & Core Infrastructure
2. **Weeks 3-4**: File Upload & FTP Integration
3. **Weeks 5-6**: Channel Management & Frontend Foundation
4. **Weeks 7-8**: File Management Interface
5. **Weeks 9-10**: Admin Interface
6. **Weeks 11-12**: Security & Performance Optimization
7. **Weeks 13-14**: Deployment & Production Setup

See [implementation-roadmap.md](./implementation-roadmap.md) for detailed phase information.

## Support and Maintenance

Post-launch maintenance includes:
- Regular security updates
- Performance monitoring
- Backup verification
- Feature enhancements based on user feedback
- Documentation updates

## Contributing

This project is designed to be maintained by a small development team with the following roles:
- 1 Full-Stack Developer (Lead)
- 1 Backend Developer
- 1 Frontend Developer
- 1 DevOps Engineer (part-time)

## License

[License information to be added]

---

This FTP File Manager provides a robust, secure, and user-friendly solution for managing file uploads to an FTP server through a web interface, with comprehensive admin capabilities and channel-based organization.