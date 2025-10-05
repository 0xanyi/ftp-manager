import app from './app';
import { prisma, redis } from './app';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to Redis
    await redis.connect();
    console.log('Connected to Redis');
    
    // Connect to database
    await prisma.$connect();
    console.log('Connected to database');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  
  await prisma.$disconnect();
  await redis.disconnect();
  
  process.exit(0);
});

startServer();