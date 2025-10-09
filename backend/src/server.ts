import app from './app';
import { createServer } from 'http';
import { prisma, redis } from './app';
import { websocketService } from './services/websocketService';
import { maintenanceService } from './services/maintenanceService';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to Redis
    await redis.connect();
    console.log('Connected to Redis');
    
    // Connect to database
    await prisma.$connect();
    console.log('Connected to database');
    
    // Create HTTP server
    const server = createServer(app);
    
    // Initialize WebSocket server
    websocketService.initialize(server);
    
    // Start maintenance service
    maintenanceService.start();
    
    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server ready`);
      console.log(`Maintenance service started`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  
  websocketService.close();
  maintenanceService.stop();
  await prisma.$disconnect();
  await redis.disconnect();
  
  process.exit(0);
});

startServer();