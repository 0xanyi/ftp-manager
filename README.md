# ToovyDrop

A modern web-based file transfer platform with user authentication, channel-based file organization, and guest upload links.

## Features

### Core Functionality
- User authentication with JWT tokens
- Role-based access control (Admin, Channel User)
- Channel-based file organization
- Guest upload links with expiration and upload limits

### File Upload System ✅
- **Chunked file uploads** supporting files up to 5GB
- **Real-time progress tracking** via WebSocket connections
- **Resumable uploads** - resume interrupted transfers
- **Upload queue management** with pause/resume functionality
- **Error handling and retry options** with exponential backoff
- **Comprehensive file validation** (40+ MIME types supported)
- **FTP integration** with automatic file transfer and storage
- **Automatic cleanup** of expired upload sessions

### File Management Interface ✅
- **Modern drag-and-drop upload** interface with visual feedback
- **File browsing** with grid and list view modes
- **Advanced search and filtering** by name, type, size, date range
- **File preview** for images, videos, audio, PDFs, and text files
- **Bulk operations** with multi-select functionality
- **Pagination** for handling large file collections
- **Responsive design** optimized for desktop and mobile devices
- **File download** with proper filename preservation
- **Secure file deletion** with confirmation dialogs

### Technical Stack
- Modern, responsive UI built with React and Tailwind CSS
- RESTful API built with Node.js, Express, and TypeScript
- PostgreSQL database with Prisma ORM
- Redis for session management and upload caching
- WebSocket support for real-time updates
- Docker support for easy deployment

## Project Structure

```
toovydrop/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/     # Route controllers (auth, files, channels, users)
│   │   ├── middleware/      # Express middleware (auth, error handling, logging)
│   │   ├── routes/          # API routes (RESTful endpoints)
│   │   ├── services/        # Business logic (upload, FTP, WebSocket, maintenance)
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utility functions (validation, logging)
│   │   ├── scripts/         # Database and utility scripts
│   │   ├── app.ts           # Express app configuration
│   │   └── server.ts        # Server startup with WebSocket support
│   ├── prisma/              # Database schema and migrations
│   ├── tests/               # Test suites (unit and integration)
│   ├── temp/                # Temporary file storage (upload chunks)
│   ├── logs/                # Application logs
│   ├── Dockerfile           # Docker configuration
│   └── package.json         # Dependencies and scripts
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── FileUpload.tsx    # Drag-and-drop upload interface
│   │   │   ├── FileList.tsx      # File browsing and management
│   │   │   ├── FilePreview.tsx   # File preview modal
│   │   │   └── admin/            # Admin-specific components
│   │   ├── contexts/        # React contexts (Auth, etc.)
│   │   ├── pages/           # Page components (Dashboard, etc.)
│   │   ├── services/        # API services (upload, file, auth)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utility functions
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # App entry point
│   ├── public/              # Static assets
│   ├── Dockerfile           # Docker configuration
│   └── package.json         # Dependencies and scripts
├── docs/                    # Documentation
├── docker-compose.yml       # Production Docker configuration
├── docker-compose.dev.yml   # Development Docker configuration
└── README.md                # This file
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL (if not using Docker)
- Redis (if not using Docker)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/toovydrop.git
   cd toovydrop
   ```

2. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

3. Update the environment variables in `.env` with your configuration.

### Development Setup

1. Start the development database services:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Generate Prisma client and push database schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Start the backend development server:
   ```bash
   npm run dev
   ```

5. In a new terminal, install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

6. Start the frontend development server:
   ```bash
   npm run dev
   ```

7. Open your browser and navigate to `http://localhost:5173`.

### Production Deployment with Docker

1. Build and start all services:
   ```bash
   docker-compose up -d --build
   ```

2. The application will be available at `http://localhost`.

## API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/create-admin` - Create admin (admin only)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token

### File Management Endpoints
- `POST /api/files/upload/initialize` - Initialize chunked upload
- `POST /api/files/upload/chunk` - Upload file chunk
- `GET /api/files/upload/:uploadId/progress` - Get upload progress
- `DELETE /api/files/upload/:uploadId/cancel` - Cancel upload
- `GET /api/files` - List files in channel (paginated)
- `GET /api/files/search` - Search files in channel
- `GET /api/files/:fileId/download` - Download file
- `DELETE /api/files/:fileId` - Delete file

### Channel Management
- `GET /api/channels` - List user channels
- `POST /api/channels` - Create channel (admin only)
- `GET /api/channels/:id` - Get channel details
- `PUT /api/channels/:id` - Update channel (admin only)
- `DELETE /api/channels/:id` - Delete channel (admin only)

### User Management
- `GET /api/users` - List users (admin only)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

For detailed API documentation, run the backend server and visit `/api/docs` (when available).

## Environment Variables

### Backend

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_ACCESS_SECRET`: Secret for signing access tokens
- `JWT_REFRESH_SECRET`: Secret for signing refresh tokens
- `FTP_HOST`: FTP server hostname
- `FTP_PORT`: FTP server port
- `FTP_USER`: FTP username
- `FTP_PASSWORD`: FTP password

### Frontend

- `VITE_API_URL`: Backend API URL (default: `/api`)

## Scripts

### Backend

- `npm run dev`: Start development server with WebSocket support
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run test`: Run tests (file upload, authentication, etc.)
- `npm run lint`: Run linter with TypeScript checking
- `npm run lint:fix`: Auto-fix linting issues
- `npm run prisma:generate`: Generate Prisma client
- `npm run prisma:push`: Push database schema
- `npm run prisma:migrate`: Run database migrations
- `npm run prisma:studio`: Open Prisma Studio
- `npm run create-admin`: Create admin user (for initial setup)

### Frontend

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run test`: Run tests
- `npm run lint`: Run linter

## Architecture Highlights

### 🚀 Performance Features
- **Chunked uploads** with configurable chunk sizes for optimal performance
- **WebSocket integration** for real-time progress updates without polling
- **Redis caching** for session management and upload state
- **Concurrent upload management** with configurable limits
- **Lazy loading** and pagination for large file collections
- **Optimized database queries** with proper indexing

### 🎨 User Experience
- **Modern, intuitive interface** built with Tailwind CSS
- **Responsive design** that works seamlessly on all devices
- **Accessibility features** with ARIA labels and keyboard navigation
- **Real-time feedback** with progress bars and status indicators
- **Error handling** with user-friendly messages and retry options
- **Dark mode support** (planned for Phase 5)

### 🔒 Security & Reliability
- **JWT-based authentication** with refresh token rotation
- **Role-based access control** with granular permissions
- **File validation** with comprehensive MIME type checking
- **Path traversal prevention** and filename sanitization
- **Automatic cleanup** of expired sessions and temporary files
- **Error logging** and monitoring capabilities

## Current Status

### ✅ Phase 1: Foundation & Core Infrastructure (Completed)
- User authentication with JWT tokens
- Role-based access control (ADMIN/CHANNEL_USER)
- Database schema with Prisma ORM
- Redis integration for caching
- Frontend React application with auth
- Admin user management system

### ✅ Phase 2: File Upload & FTP Integration (Completed)
- Chunked file upload system (up to 5GB files)
- Real-time WebSocket progress tracking
- Comprehensive file validation (40+ MIME types)
- FTP integration with automatic file transfer
- Resumable upload functionality
- File management API (CRUD operations)
- Automatic cleanup and maintenance

### ✅ Phase 3: Channel Management & Frontend Foundation (Completed)
- Channel CRUD operations with RESTful API
- User-channel assignment system
- Guest upload link generation with expiration
- Enhanced frontend with tabbed interface
- Real-time progress visualization
- File organization by channels

### ✅ Phase 4: File Management Interface (Completed)
- Drag-and-drop file upload with queue management
- Upload progress tracking with pause/resume functionality
- Error handling and retry mechanisms
- File browsing with search and filtering
- File preview for common media types
- Bulk file operations (select, delete, download)
- Responsive design for mobile and desktop
- Keyboard navigation and accessibility features

### 🚧 Phase 5: Admin Interface (Next)
- Advanced user management dashboard
- System analytics and reporting
- File usage statistics and monitoring
- Channel management interface
- System configuration and settings
- Audit logs and activity tracking

### 📋 Supported File Types
- **Images**: JPG, PNG, GIF, WebP, SVG
- **Documents**: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV
- **Archives**: ZIP, RAR, 7Z, TAR, GZ
- **Video**: MP4, MOV, AVI, WebM
- **Audio**: MP3, WAV, OGG
- **Code**: JS, JSON, HTML, CSS, XML, MD

### 🔒 Security Features
- JWT-based authentication with refresh tokens
- Role-based access control
- Input validation with Joi schemas
- File type and size restrictions
- Path traversal prevention
- Filename sanitization
- HTTPS ready for production

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## About ToovyDrop

ToovyDrop is part of the Toovy platform ecosystem, providing secure and efficient file transfer solutions for businesses and content creators. Built with modern web technologies and focusing on user experience, ToovyDrop simplifies the complexity of file management while maintaining enterprise-grade security.

For more information about the Toovy platform, visit [toovy.com](https://toovy.com).