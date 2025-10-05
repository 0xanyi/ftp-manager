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
- `GET /api/files` - List files in channel (paginated)
- `GET /api/files/search` - Search files in channel
- `GET /api/files/:fileId/download` - Download file
- `DELETE /api/files/:fileId` - Delete file

## Security Checklist

- [x] Input validation on all endpoints
- [x] File type and size restrictions
- [x] Path traversal prevention
- [x] Admin-only endpoint protection
- [x] JWT token security
- [x] Database query safety
- [ ] Rate limiting implemented
- [ ] HTTPS in production

---

**This document serves as the complete development guide for all agents working on the ToovyDrop project. All guidelines are mandatory unless explicitly marked as optional.**
