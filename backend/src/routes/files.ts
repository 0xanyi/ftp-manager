import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  initializeUpload,
  uploadChunk,
  getUploadProgress,
  cancelUpload,
  listFiles,
  searchFiles,
  downloadFile,
  deleteFile,
  uploadMiddleware,
} from '../controllers/fileController';

const router = Router();

// Apply authentication to all file routes
router.use(authenticate);

// Upload routes
router.post('/upload/initialize', initializeUpload);
router.post('/upload/chunk', uploadMiddleware, uploadChunk);
router.get('/upload/:uploadId/progress', getUploadProgress);
router.delete('/upload/:uploadId/cancel', cancelUpload);

// File management routes
router.get('/', listFiles);
router.get('/search', searchFiles);
router.get('/:fileId/download', downloadFile);
router.delete('/:fileId', deleteFile);

export default router;