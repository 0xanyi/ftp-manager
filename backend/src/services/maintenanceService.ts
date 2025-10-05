import { UploadService } from './uploadService';
import { logger } from '../utils/logger';

// Global declarations
declare const setInterval: (callback: () => void, delay: number) => NodeJS.Timeout;
declare const setTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;
declare const clearInterval: (intervalId: NodeJS.Timeout) => void;

export class MaintenanceService {
  private uploadService: UploadService;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.uploadService = new UploadService();
  }

  /**
   * Start the maintenance service
   */
  start(): void {
    // Run cleanup every 30 minutes
    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, 30 * 60 * 1000); // 30 minutes

    // Run initial cleanup after 5 minutes
    setTimeout(() => {
      this.performCleanup();
    }, 5 * 60 * 1000); // 5 minutes

    logger.info('Maintenance service started');
  }

  /**
   * Stop the maintenance service
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    logger.info('Maintenance service stopped');
  }

  /**
   * Perform cleanup tasks
   */
  private async performCleanup(): Promise<void> {
    try {
      logger.info('Starting maintenance cleanup...');
      
      // Clean up expired upload sessions
      await this.uploadService.cleanupExpiredSessions();
      
      logger.info('Maintenance cleanup completed');
    } catch (error) {
      logger.error('Error during maintenance cleanup:', error);
    }
  }
}

// Export singleton instance
export const maintenanceService = new MaintenanceService();
