# AGENTS.md - Development Guidelines

## Project Overview

The FTP File Manager is a web-based application that enables content contributors to upload files to an FTP server without requiring FTP client software. The system provides channel-based organization, allowing different content channels (like "love" or "jammy") to have their own dedicated folders on the FTP server.

### Key Features
- Web-based file upload with support for files up to 5GB
- Channel-based file organization
- User authentication and role-based access control
- Guest upload functionality with unique links
- Real-time upload progress tracking
- Full file management (upload, download, preview, delete)
- Admin dashboard for system management
- Direct channel access for regular users

### Technology Stack
- **Backend**: Node.js with Express.js, TypeScript, PostgreSQL, Prisma ORM
- **Frontend**: React with TypeScript, Vite, Tailwind CSS
- **Infrastructure**: Docker, Coolify deployment, Nginx reverse proxy
- **File Storage**: FTP server integration with chunked uploads

## Build and Test Commands

### Backend Commands

```bash
# Install dependencies
cd backend && npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run database migrations
npm run migrate

# Generate Prisma client
npm run prisma:generate

# View database in Prisma Studio
npm run prisma:studio

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Frontend Commands

```bash
# Install dependencies
cd frontend && npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Docker Commands

```bash
# Build all services
docker-compose build

# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Start production environment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Code Style Guidelines

### Import Formatting

#### Backend (Node.js/TypeScript)

```typescript
// 1. Node.js built-in modules
import { createServer } from 'http';
import { join } from 'path';

// 2. Third-party packages
import express from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

// 3. Local modules (use relative imports)
import { authMiddleware } from './middleware/auth';
import { validateInput } from './utils/validation';
import { FTPService } from './services/ftp';
```

#### Frontend (React/TypeScript)

```typescript
// 1. React libraries
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// 2. Third-party packages
import axios from 'axios';
import { Dropzone } from 'react-dropzone';

// 3. Local components (use relative imports)
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useAuth } from '../hooks/useAuth';
```

### Types

#### Type Definitions

```typescript
// Use interfaces for object shapes that can be extended
interface User {
  id: string;
  email: string;
  role: UserRole;
  channels: Channel[];
}

// Use types for unions or calculated types
type UserRole = 'admin' | 'channel_user';
type FileStatus = 'uploading' | 'completed' | 'failed';

// Use enums for fixed sets of values
enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FTP_ERROR = 'FTP_ERROR'
}
```

#### Generic Types

```typescript
// Use generics for reusable components and functions
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Use utility types when appropriate
type PartialUser = Partial<User>;
type UserWithoutPassword = Omit<User, 'passwordHash'>;
```

### Naming Conventions

#### Variables and Functions

```typescript
// Use camelCase for variables and functions
const userName = 'john_doe';
const isLoggedIn = true;

function getUserById(id: string): Promise<User | null> {
  // Implementation
}

function validateEmail(email: string): boolean {
  // Implementation
}
```

#### Constants

```typescript
// Use UPPER_SNAKE_CASE for constants
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const API_BASE_URL = 'https://api.example.com';
```

#### Classes

```typescript
// Use PascalCase for classes
class FTPService {
  private connection: FTPConnection;
  
  constructor(config: FTPConfig) {
    // Implementation
  }
  
  public async uploadFile(filePath: string): Promise<void> {
    // Implementation
  }
}
```

#### Files and Directories

```typescript
// Use kebab-case for file names
// user-service.ts
// file-upload-controller.ts
// authentication-middleware.ts

// Use kebab-case for directory names
// services/
// components/
// middleware/
```

#### Database Models

```typescript
// Use PascalCase for model names
// Prisma will handle the conversion to snake_case in the database
model User {
  id        String   @id @default(dbgenerated("gen_random_uuid()"))
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Errors and Error Handling

#### Error Classes

```typescript
// Create custom error classes for different error types
class ValidationError extends Error {
  public readonly code: string;
  public readonly details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.details = details;
  }
}

class FTPError extends Error {
  public readonly code: string;
  public readonly originalError?: Error;

  constructor(message: string, code: string, originalError?: Error) {
    super(message);
    this.name = 'FTPError';
    this.code = code;
    this.originalError = originalError;
  }
}
```

#### Error Handling Patterns

```typescript
// Use try-catch blocks for error handling
async function uploadFile(file: File): Promise<string> {
  try {
    // Validate file
    if (!validateFile(file)) {
      throw new ValidationError('Invalid file format', { file });
    }
    
    // Upload file
    const result = await ftpService.upload(file);
    return result.filePath;
  } catch (error) {
    // Log error for debugging
    logger.error('File upload failed', { error, file: file.name });
    
    // Re-throw with appropriate context
    if (error instanceof ValidationError) {
      throw error;
    }
    
    throw new FTPError('Failed to upload file', 'UPLOAD_ERROR', error);
  }
}

// Use Result pattern for operations that can fail
type Result<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

function safeParseJSON(json: string): Result<any> {
  try {
    return {
      success: true,
      data: JSON.parse(json)
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error
    };
  }
}
```

#### API Error Responses

```typescript
// Standardize error response format
function createErrorResponse(res: Response, error: Error, statusCode: number = 500): void {
  const errorResponse = {
    success: false,
    error: {
      code: error.name || 'INTERNAL_ERROR',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  };
  
  res.status(statusCode).json(errorResponse);
}

// Use error handling middleware
function errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
  if (error instanceof ValidationError) {
    return createErrorResponse(res, error, 400);
  }
  
  if (error instanceof AuthenticationError) {
    return createErrorResponse(res, error, 401);
  }
  
  // Default error handler
  createErrorResponse(res, error, 500);
}
```

#### Frontend Error Handling

```typescript
// Use error boundaries in React
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Something went wrong.</h1>
          <p>Please refresh the page and try again.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Use custom hooks for API error handling
function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get<T>(url);
        setData(response.data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
}
```

## Usage Notes

### Development Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env.development` and configure
3. Start development environment: `docker-compose -f docker-compose.dev.yml up -d`
4. Install dependencies in both backend and frontend
5. Run database migrations: `cd backend && npm run migrate`
6. Start development servers: `npm run dev`

### Code Organization

- **Backend Structure**:
  - `src/controllers/` - API route handlers
  - `src/services/` - Business logic services
  - `src/middleware/` - Express middleware
  - `src/routes/` - API route definitions
  - `src/models/` - Database models
  - `src/utils/` - Utility functions
  - `src/types/` - TypeScript type definitions

- **Frontend Structure**:
  - `src/components/` - Reusable UI components
  - `src/pages/` - Page components
  - `src/hooks/` - Custom React hooks
  - `src/services/` - API service functions
  - `src/utils/` - Utility functions
  - `src/types/` - TypeScript type definitions
  - `src/styles/` - Style files

### Database Operations

- Always use Prisma for database operations
- Use transactions for multiple related operations
- Handle database errors gracefully
- Use proper indexes for performance

### File Uploads

- Use chunked uploads for large files
- Implement progress tracking
- Validate files before upload
- Handle upload errors with retry logic
- Clean up temporary files after upload

### Security Considerations

- Validate all user inputs
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization
- Use HTTPS in production
- Sanitize file names and paths
- Implement rate limiting for API endpoints

### Testing

- Write unit tests for all utility functions
- Write integration tests for API endpoints
- Write end-to-end tests for critical user flows
- Aim for at least 80% code coverage
- Test error conditions as well as success paths

This document serves as a guide for all development agents working on this project. Following these guidelines will ensure consistency, maintainability, and quality across the codebase.