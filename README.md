# ToovyDrop

A modern web-based file transfer platform with user authentication, channel-based file organization, and guest upload links.

## Features

- User authentication with JWT tokens
- Role-based access control (Admin, Channel User)
- Channel-based file organization
- Guest upload links with expiration and upload limits
- Secure file uploads with validation
- Modern, responsive UI built with React and Tailwind CSS
- RESTful API built with Node.js, Express, and TypeScript
- PostgreSQL database with Prisma ORM
- Redis for session management
- Docker support for easy deployment

## Project Structure

```
toovydrop/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utility functions
│   │   ├── app.ts           # Express app configuration
│   │   └── server.ts        # Server startup
│   ├── prisma/              # Database schema and migrations
│   ├── Dockerfile           # Docker configuration
│   └── package.json         # Dependencies and scripts
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React contexts
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
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

The API documentation is available at `/api/docs` when running the backend server.

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

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run test`: Run tests
- `npm run lint`: Run linter
- `npm run prisma:generate`: Generate Prisma client
- `npm run prisma:push`: Push database schema
- `npm run prisma:migrate`: Run database migrations
- `npm run prisma:studio`: Open Prisma Studio

### Frontend

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run test`: Run tests
- `npm run lint`: Run linter

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