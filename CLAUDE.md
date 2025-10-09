# ToovyDrop

Web-based file transfer platform with channel-based organization and role-based access control.

## Core Commands

• Type-check and lint (backend): `cd backend && npm run lint`
• Auto-fix style (backend): `cd backend && npm run lint:fix`
• Type-check and lint (frontend): `cd frontend && npm run lint`
• Auto-fix style (frontend): `cd frontend && npm run lint:fix`
• Run full test suite (backend): `cd backend && npm test`
• Run full test suite (frontend): `cd frontend && npm test`
• Start dev servers: `npm run dev` (from project root)
• Build for production: `npm run build` (from backend/frontend)
• Database migrations: `cd backend && npm run prisma:migrate`
• Create admin user: `cd backend && npm run create-admin`

## Project Layout

├─ backend/ → Express + TypeScript API server
├─ frontend/ → React + Vite frontend
├─ docs/ → Documentation and roadmaps
├─ scripts/ → Development and deployment scripts

• Frontend code lives **only** in `frontend/`
• Backend code lives **only** in `backend/`
• Shared configuration and docs belong in project root

### Frontend Components (Phase IV)
- `FileUpload.tsx` → Drag-and-drop upload interface with queue management
- `FileList.tsx` → File browsing with search, filtering, and bulk operations
- `FilePreview.tsx` → Modal preview system for common file types
- `hooks/useUploads.ts` → Custom hook for upload state management

### Frontend Services (Phase IV)
- `services/uploadService.ts` → Upload management with WebSocket integration
- `services/fileService.ts` → File operations, search, and utilities

### Frontend Admin Components (Phase V)
- `admin/AdminDashboard.tsx` → Main admin dashboard with overview and navigation
- `admin/UserList.tsx` → User management interface with CRUD operations
- `admin/UserForm.tsx` → User creation and editing form
- `admin/UserChannelAssignment.tsx` → User channel assignment management
- `admin/ChannelList.tsx` → Channel management interface
- `admin/ChannelForm.tsx` → Channel creation and editing form
- `admin/ChannelUserAssignment.tsx` → Channel user assignment management
- `admin/FileAdministration.tsx` → File administration interface with advanced filtering
- `admin/AnalyticsDashboard.tsx` → Analytics dashboard with charts and metrics
- `admin/SystemConfiguration.tsx` → System settings and configuration interface

### Frontend Admin Services (Phase V)
- `services/adminService.ts` → Admin API service for dashboard, analytics, and management

## Current Status

### Phase I: Foundation & Core Infrastructure ✅ COMPLETED
- Authentication system with JWT tokens
- Role-based access control (ADMIN/CHANNEL_USER)
- Database schema with Prisma ORM
- Redis integration for caching
- Frontend React application with auth
- Admin user management system

### Phase II: File Upload & FTP Integration ✅ COMPLETED
- ✅ Chunked file upload endpoints (5GB support)
- ✅ FTP connection management with error handling
- ✅ File validation and security (40+ MIME types)
- ✅ Real-time upload progress tracking via WebSocket
- ✅ Complete file management API (CRUD operations)
- ✅ Resumable upload functionality
- ✅ Automatic cleanup of expired uploads

### Phase III: Channel Management & Frontend Foundation ✅ COMPLETED
- ✅ Channel CRUD operations (create, read, update, delete)
- ✅ User-channel assignment system
- ✅ Channel-based file organization
- ✅ Channel access control with role-based permissions
- ✅ FTP directory management per channel
- ✅ Channel validation and security
- ✅ Frontend foundation (React, TypeScript, Tailwind CSS)

### Phase IV: File Management Interface ✅ COMPLETED
- ✅ Drag-and-drop file upload component with queue management
- ✅ Real-time upload progress visualization with pause/resume
- ✅ Comprehensive file validation and error handling with retry
- ✅ File list component with pagination and sorting
- ✅ Advanced search and filtering capabilities
- ✅ File preview system for images, videos, audio, PDFs, and text
- ✅ Bulk file operations (select, delete, download)
- ✅ Responsive design optimized for desktop and mobile
- ✅ Keyboard navigation and accessibility features
- ✅ File download functionality with proper filename handling
- ✅ Secure file deletion with confirmation dialogs

### Phase V: Admin Interface ✅ COMPLETED
- ✅ Comprehensive admin dashboard with real-time statistics and system health
- ✅ Complete user management with CRUD operations, role assignment, and channel management
- ✅ Advanced channel management with user assignments and usage statistics
- ✅ File administration interface with filtering, bulk operations, and detailed file information
- ✅ Analytics dashboard with charts, metrics, storage usage analysis, and activity monitoring
- ✅ System configuration interface including security, email, storage, and general settings
- ✅ Admin authentication, authorization, and secure access controls throughout
- ✅ Activity monitoring and audit logging capabilities

## Development Patterns & Constraints

### Coding Style
• TypeScript strict mode with proper type definitions
• 100-char line limit, 2-space indentation
• Use interfaces for public APIs; avoid `@ts-ignore`
• Conventional commit messages: `type(scope): description`
• Tests first when implementing new features
• Visual diff loop for UI components

### Security Requirements
• Password complexity: 8+ chars, uppercase, lowercase, number, special
• Input validation with Joi schemas
• Parameterized queries via Prisma ORM
• JWT authentication with refresh tokens
• Role-based endpoint protection
• File name and path sanitization

### Database Operations
• Always use Prisma for database operations
• Use transactions for related operations
• Handle errors gracefully with proper logging
• Maintain indexes for performance

## Git Workflow Essentials

1. Branch from `main` with descriptive name: `feature/<slug>` or `bugfix/<slug>`.
2. Run lint and type checks locally **before** committing.
3. Force pushes **allowed only** on feature branches using `git push --force-with-lease`. Never force-push `main`.
4. Keep commits atomic; prefer checkpoints (`feat: …`, `test: …`, `fix: …`).
5. **ALWAYS commit after each new function** - one function per commit.

## Evidence Required for Every Task

A task is considered complete when it includes:

- All tests passing (`npm test` in respective directory)
- Lint & type check pass (`npm run lint`)
- **IDE diagnostics check** - run `getIdeDiagnostics` on all modified files
- **Proof artifact**
  • Bug fix → failing test added first, now passes
  • Feature → new tests demonstrating behavior
  • UI change → visual proof of functionality
- Atomic commits with descriptive messages
- No drop in code quality or coverage

## MANDATORY Development Practices

**CRITICAL WORKFLOW - MUST FOLLOW FOR EVERY FUNCTION:**

1. **Create feature branch before ANY code changes**
2. **Write secure, best practice code** - No exceptions
3. **Write tests immediately for each function**
4. **Run IDE diagnostics and fix all errors**
5. **Commit after each new function** - One function per commit
6. **Clean up test scripts once passing**

## Planning Requirements

**Before Starting Work:**
- Write detailed implementation plan in `tasks/TASK_NAME.md`
- Include clear breakdown of implementation steps
- Focus on Minimum Viable Product (MVP)
- Request approval before implementing

**While Implementing:**
- Keep plan updated with progress
- Document any changes or discoveries
- Note any blockers or dependencies

## Quick Start

1. Clone repository and copy `.env.example` to `.env.development`
2. Start development environment: `docker-compose -f docker-compose.dev.yml up -d`
3. Install dependencies: `cd backend && npm install && cd ../frontend && npm install`
4. Run database migrations: `cd backend && npm run prisma:migrate`
5. Create admin user: `cd backend && npm run create-admin`
6. Start dev servers: `npm run dev` (from project root)
7. Access at: Frontend http://localhost:5174, Backend http://localhost:3000

## Admin Access

Default admin credentials (after running create-admin):
- Email: `admin@example.com`
- Password: `AdminPassword123!`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/create-admin` - Create admin (admin only)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token

### Files
- `POST /api/files/upload/initialize` - Initialize chunked upload
- `POST /api/files/upload/chunk` - Upload file chunk
- `GET /api/files/upload/:uploadId/progress` - Get upload progress
- `DELETE /api/files/upload/:uploadId/cancel` - Cancel upload
- `GET /api/files` - List files in channel (paginated, sortable, filterable)
- `GET /api/files/search` - Search files in channel
- `GET /api/files/:fileId/preview` - Generate file preview
- `GET /api/files/:fileId/download` - Download file
- `DELETE /api/files/:fileId` - Delete file
- `POST /api/files/bulk-delete` - Delete multiple files
- `PUT /api/files/:fileId/metadata` - Update file metadata

### Upload Management (Phase IV)
- `POST /api/uploads/initiate` - Initiate upload session
- `DELETE /api/uploads/:uploadId` - Cancel upload session

### Admin Management (Phase V)
- `GET /api/admin/dashboard/stats` - Get dashboard statistics
- `GET /api/admin/system/health` - Get system health information
- `GET /api/admin/analytics` - Get comprehensive analytics data
- `GET /api/admin/audit-logs` - Get audit logs with pagination
- `GET /api/admin/users` - Get user list with filtering and pagination
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Deactivate user
- `POST /api/admin/users/:id/reactivate` - Reactivate user
- `GET /api/admin/users/:id/channels` - Get user channel assignments
- `PUT /api/admin/users/:id/channels` - Update user channel assignments
- `GET /api/admin/files` - Get admin file list with advanced filtering
- `GET /api/admin/files/:id` - Get file details for admin
- `POST /api/admin/files/bulk-operation` - Perform bulk file operations
- `GET /api/admin/files/storage-stats` - Get system storage statistics

## Build & Deployment Status

### Current Build Status ✅ HEALTHY
- **Backend**: TypeScript compilation passes ✅
- **Frontend**: Vite build successful ✅
- **Database**: Prisma schema up to date ✅
- **Tests**: All test suites passing ✅
- **Linting**: ESLint rules passing ✅

### Environment Configuration
- **Development**: Docker Compose with hot reload
- **Frontend Dev Server**: http://localhost:5174 (auto-selects available port)
- **Backend API**: http://localhost:3000
- **Database**: PostgreSQL on port 5432
- **Cache**: Redis on port 6379
- **WebSocket**: Real-time progress tracking enabled

### Frontend Features (Phase IV)
- **Upload Interface**: Drag-and-drop with queue management
- **File Browser**: Grid/List views with pagination
- **Search & Filter**: Advanced filtering capabilities
- **Preview System**: Modal preview for common file types
- **Bulk Operations**: Multi-select with batch actions
- **Responsive Design**: Mobile-optimized interface
- **Accessibility**: WCAG compliant with keyboard navigation

### WebSocket Integration
- **Upload Progress**: Real-time progress updates
- **Status Updates**: Live status notifications
- **Error Handling**: Instant error feedback
- **Queue Management**: Real-time queue status

## Security Checklist

- [x] Input validation on all endpoints
- [x] File type and size restrictions
- [x] Path traversal prevention
- [x] Admin-only endpoint protection
- [x] JWT token security
- [x] Database query safety
- [ ] Rate limiting implemented
- [ ] HTTPS in production

## Next Phase: Phase VI - Security & Performance Optimization 🚧 NEXT

### Planned Features (Weeks 11-12)
- **Security Hardening**: Rate limiting, CSRF protection, security headers
- **Performance Optimization**: Database query optimization, caching strategies
- **Testing Suite**: Comprehensive unit, integration, and end-to-end tests
- **Monitoring**: Performance metrics and application monitoring
- **Production Ready**: SSL configuration, backup strategies, health checks

### Implementation Notes
- **Priority**: Focus on production readiness and performance
- **Security**: Implement comprehensive security measures
- **Testing**: Achieve 80%+ test coverage
- **Performance**: Optimize for production workloads

## Project Readiness Assessment

### ✅ Production Readiness
- **Core Features**: File upload, management, and organization complete
- **Security**: Authentication, authorization, and validation implemented
- **Performance**: Optimized for file handling and real-time updates
- **Documentation**: Comprehensive API and component documentation
- **Testing**: Unit and integration tests covering critical paths

### 🔄 Current State
- **Build Status**: All builds passing ✅
- **Code Quality**: TypeScript strict mode enforced ✅
- **Dependencies**: All packages up to date ✅
- **Database**: Schema stable with migrations ✅
- **Documentation**: Updated and comprehensive ✅
- **Admin Interface**: Complete and fully functional ✅
- **API Endpoints**: All admin endpoints implemented ✅
- **Frontend Components**: Comprehensive admin interface ✅
- **Security**: Admin authentication and authorization complete ✅

### 📊 Metrics
- **File Size Support**: Up to 5GB per file
- **Concurrent Uploads**: 3 simultaneous uploads
- **Supported File Types**: 40+ MIME types
- **Database Tables**: 6 core tables with proper relationships
- **API Endpoints**: 20+ RESTful endpoints
- **Frontend Components**: 15+ reusable components
- **WebSocket Events**: 4 real-time event types

---

**This document serves as the complete development guide for all agents working on the ToovyDrop project. All guidelines are mandatory unless explicitly marked as optional.**

**Last Updated**: October 2024 - Phase IV Complete
**Next Milestone**: Phase V - Admin Interface Development