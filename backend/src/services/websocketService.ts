import { Server as WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';
import { logger } from '../utils/logger';

// Global declarations for Node.js environment
declare const WebSocket: any;
declare const URL: any;
declare const setInterval: (callback: () => void, delay: number) => NodeJS.Timeout;
declare const clearInterval: (intervalId: NodeJS.Timeout) => void;

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  uploadId?: string;
  timestamp: number;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(server: unknown): void {
    this.wss = new WebSocketServer({
      server,
      verifyClient: this.verifyClient.bind(this),
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();
    
    logger.info('WebSocket server initialized');
  }

  /**
   * Verify WebSocket client authentication
   */
  private async verifyClient(info: {
    origin: string;
    secure: boolean;
    req: IncomingMessage;
  }): Promise<boolean> {
    try {
      const token = this.extractToken(info.req);
      
      if (!token) {
        return false;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { id: string; email: string; role: string };
      
      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, isActive: true },
      });

      return !!(user && user.isActive);
    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      return false;
    }
  }

  /**
   * Extract JWT token from request
   */
  private extractToken(req: IncomingMessage): string | null {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    return url.searchParams.get('token');
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: AuthenticatedWebSocket, req: IncomingMessage): Promise<void> {
    try {
      const token = this.extractToken(req);
      const decoded = jwt.verify(token!, process.env.JWT_ACCESS_SECRET!) as any;
      
      ws.userId = decoded.id;
      ws.isAlive = true;

      // Add client to user's client set
      if (!this.clients.has(ws.userId)) {
        this.clients.set(ws.userId, new Set());
      }
      this.clients.get(ws.userId)!.add(ws);

      // Set up event handlers
      ws.on('message', this.handleMessage.bind(this, ws));
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      ws.on('close', this.handleClose.bind(this, ws));
      ws.on('error', this.handleError.bind(this, ws));

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connected',
        data: { message: 'WebSocket connection established' },
        timestamp: Date.now(),
      });

      logger.info(`WebSocket connected for user: ${ws.userId}`);
    } catch (error) {
      logger.error('Error handling WebSocket connection:', error);
      ws.close(1008, 'Authentication failed');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(ws: AuthenticatedWebSocket, message: Buffer): Promise<void> {
    try {
      const parsedMessage: WebSocketMessage = JSON.parse(message.toString());
      
      switch (parsedMessage.type) {
        case 'subscribe_upload':
          await this.handleSubscribeUpload(ws, parsedMessage.uploadId);
          break;
        case 'unsubscribe_upload':
          await this.handleUnsubscribeUpload(ws, parsedMessage.uploadId);
          break;
        case 'ping':
          this.sendToClient(ws, {
            type: 'pong',
            data: { timestamp: Date.now() },
            timestamp: Date.now(),
          });
          break;
        default:
          logger.warn(`Unknown WebSocket message type: ${parsedMessage.type}`);
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * Handle upload subscription
   */
  private async handleSubscribeUpload(ws: AuthenticatedWebSocket, uploadId?: string): Promise<void> {
    if (!uploadId) {
      return;
    }

    // Store subscription in a separate data structure if needed
    // For now, we'll rely on the client to poll for progress
    
    this.sendToClient(ws, {
      type: 'subscribed_upload',
      data: { uploadId },
      timestamp: Date.now(),
    });

    logger.info(`User ${ws.userId} subscribed to upload ${uploadId}`);
  }

  /**
   * Handle upload unsubscription
   */
  private async handleUnsubscribeUpload(ws: AuthenticatedWebSocket, uploadId?: string): Promise<void> {
    if (!uploadId) {
      return;
    }

    this.sendToClient(ws, {
      type: 'unsubscribed_upload',
      data: { uploadId },
      timestamp: Date.now(),
    });

    logger.info(`User ${ws.userId} unsubscribed from upload ${uploadId}`);
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(ws: AuthenticatedWebSocket): void {
    if (ws.userId && this.clients.has(ws.userId)) {
      this.clients.get(ws.userId)!.delete(ws);
      
      // Clean up empty client sets
      if (this.clients.get(ws.userId)!.size === 0) {
        this.clients.delete(ws.userId);
      }
    }

    logger.info(`WebSocket disconnected for user: ${ws.userId}`);
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(ws: AuthenticatedWebSocket, error: Error): void {
    logger.error('WebSocket error:', error);
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Error sending WebSocket message:', error);
      }
    }
  }

  /**
   * Broadcast upload progress to user's clients
   */
  broadcastUploadProgress(userId: string, uploadId: string, progress: any): void {
    const userClients = this.clients.get(userId);
    if (!userClients) {
      return;
    }

    const message: WebSocketMessage = {
      type: 'upload_progress',
      data: {
        uploadId,
        ...progress,
      },
      uploadId,
      timestamp: Date.now(),
    };

    userClients.forEach((ws) => {
      this.sendToClient(ws, message);
    });
  }

  /**
   * Broadcast upload completion to user's clients
   */
  broadcastUploadComplete(userId: string, uploadId: string, fileId: string): void {
    const userClients = this.clients.get(userId);
    if (!userClients) {
      return;
    }

    const message: WebSocketMessage = {
      type: 'upload_complete',
      data: {
        uploadId,
        fileId,
        message: 'Upload completed successfully',
      },
      uploadId,
      timestamp: Date.now(),
    };

    userClients.forEach((ws) => {
      this.sendToClient(ws, message);
    });
  }

  /**
   * Broadcast upload error to user's clients
   */
  broadcastUploadError(userId: string, uploadId: string, error: string): void {
    const userClients = this.clients.get(userId);
    if (!userClients) {
      return;
    }

    const message: WebSocketMessage = {
      type: 'upload_error',
      data: {
        uploadId,
        error,
      },
      uploadId,
      timestamp: Date.now(),
    };

    userClients.forEach((ws) => {
      this.sendToClient(ws, message);
    });
  }

  /**
   * Broadcast file operation updates to user's clients
   */
  broadcastFileOperation(userId: string, operation: string, data: any): void {
    const userClients = this.clients.get(userId);
    if (!userClients) {
      return;
    }

    const message: WebSocketMessage = {
      type: 'file_operation',
      data: {
        operation,
        ...data,
      },
      timestamp: Date.now(),
    };

    userClients.forEach((ws) => {
      this.sendToClient(ws, message);
    });
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) {
        return;
      }

      this.wss.clients.forEach((ws) => {
        const authenticatedWs = ws as AuthenticatedWebSocket;
        
        if (!authenticatedWs.isAlive) {
          authenticatedWs.terminate();
          return;
        }

        authenticatedWs.isAlive = false;
        authenticatedWs.ping();
      });
    }, 30000); // 30 seconds
  }

  /**
   * Close all connections
   */
  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
    logger.info('WebSocket server closed');
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    userConnections: Array<{ userId: string; connections: number }>;
  } {
    const userConnections = Array.from(this.clients.entries()).map(([userId, clients]) => ({
      userId,
      connections: clients.size,
    }));

    return {
      totalConnections: Array.from(this.clients.values()).reduce((sum, clients) => sum + clients.size, 0),
      userConnections,
    };
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
