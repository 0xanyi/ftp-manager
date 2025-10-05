import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/app';
import jwt from 'jsonwebtoken';
import fs from 'fs-extra';
import path from 'path';

// Test data
const testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'CHANNEL_USER' as const,
};

const testChannel = {
  id: 'test-channel-id',
  name: 'Test Channel',
  slug: 'test-channel',
  ftpPath: '/test',
  isActive: true,
};

const testAdmin = {
  id: 'test-admin-id',
  email: 'admin@example.com',
  role: 'ADMIN' as const,
};

let authToken: string;
let adminToken: string;

beforeAll(async () => {
  // Create test user and admin in database
  await prisma.user.createMany({
    data: [
      {
        id: testUser.id,
        email: testUser.email,
        passwordHash: 'hashedpassword',
        role: testUser.role,
      },
      {
        id: testAdmin.id,
        email: testAdmin.email,
        passwordHash: 'hashedpassword',
        role: testAdmin.role,
      },
    ],
    skipDuplicates: true,
  });

  // Create test channel
  await prisma.channel.create({
    data: testChannel,
    skipDuplicates: true,
  });

  // Assign user to channel
  await prisma.userChannel.create({
    data: {
      userId: testUser.id,
      channelId: testChannel.id,
    },
    skipDuplicates: true,
  });

  // Generate JWT tokens
  authToken = jwt.sign(
    { id: testUser.id, email: testUser.email, role: testUser.role },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '1h' }
  );

  adminToken = jwt.sign(
    { id: testAdmin.id, email: testAdmin.email, role: testAdmin.role },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '1h' }
  );

  // Ensure temp directory exists
  await fs.ensureDir(path.join(process.cwd(), 'temp', 'uploads'));
});

afterAll(async () => {
  // Clean up test data
  await prisma.userChannel.deleteMany({
    where: { userId: { in: [testUser.id, testAdmin.id] } },
  });
  
  await prisma.file.deleteMany({
    where: { channelId: testChannel.id },
  });
  
  await prisma.channel.delete({
    where: { id: testChannel.id },
  });
  
  await prisma.user.deleteMany({
    where: { id: { in: [testUser.id, testAdmin.id] } },
  });

  // Clean up temp files
  await fs.remove(path.join(process.cwd(), 'temp'));
  
  await prisma.$disconnect();
});

describe('File Upload API', () => {
  describe('POST /api/files/upload/initialize', () => {
    it('should initialize upload with valid data', async () => {
      const response = await request(app)
        .post('/api/files/upload/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'test.txt',
          mimeType: 'text/plain',
          size: 1024,
          channelId: testChannel.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('uploadId');
      expect(response.body.data).toHaveProperty('totalChunks');
    });

    it('should reject upload without authentication', async () => {
      const response = await request(app)
        .post('/api/files/upload/initialize')
        .send({
          filename: 'test.txt',
          mimeType: 'text/plain',
          size: 1024,
          channelId: testChannel.id,
        });

      expect(response.status).toBe(401);
    });

    it('should reject upload with invalid file type', async () => {
      const response = await request(app)
        .post('/api/files/upload/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'test.exe',
          mimeType: 'application/x-executable',
          size: 1024,
          channelId: testChannel.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('not allowed');
    });

    it('should reject upload with file size too large', async () => {
      const response = await request(app)
        .post('/api/files/upload/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'large.bin',
          mimeType: 'application/octet-stream',
          size: 6 * 1024 * 1024 * 1024, // 6GB
          channelId: testChannel.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('exceeds maximum');
    });

    it('should reject upload to non-existent channel', async () => {
      const response = await request(app)
        .post('/api/files/upload/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'test.txt',
          mimeType: 'text/plain',
          size: 1024,
          channelId: 'non-existent-channel',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Channel not found');
    });
  });

  describe('GET /api/files/upload/:uploadId/progress', () => {
    let uploadId: string;

    beforeEach(async () => {
      // Initialize an upload for testing
      const response = await request(app)
        .post('/api/files/upload/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'test.txt',
          mimeType: 'text/plain',
          size: 1024,
          channelId: testChannel.id,
        });

      uploadId = response.body.data.uploadId;
    });

    it('should return upload progress for valid upload ID', async () => {
      const response = await request(app)
        .get(`/api/files/upload/${uploadId}/progress`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('uploadId');
      expect(response.body.data).toHaveProperty('progress');
      expect(response.body.data).toHaveProperty('uploadedChunks');
      expect(response.body.data).toHaveProperty('totalChunks');
    });

    it('should return 404 for non-existent upload ID', async () => {
      const response = await request(app)
        .get('/api/files/upload/non-existent/progress')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('DELETE /api/files/upload/:uploadId/cancel', () => {
    let uploadId: string;

    beforeEach(async () => {
      // Initialize an upload for testing
      const response = await request(app)
        .post('/api/files/upload/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'test.txt',
          mimeType: 'text/plain',
          size: 1024,
          channelId: testChannel.id,
        });

      uploadId = response.body.data.uploadId;
    });

    it('should cancel upload successfully', async () => {
      const response = await request(app)
        .delete(`/api/files/upload/${uploadId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled');
    });

    it('should handle cancellation of non-existent upload gracefully', async () => {
      const response = await request(app)
        .delete('/api/files/upload/non-existent/cancel')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200); // Should still return success
    });
  });

  describe('GET /api/files', () => {
    it('should return files for user with channel access', async () => {
      const response = await request(app)
        .get('/api/files')
        .query({ channelId: testChannel.id, page: 1, limit: 20 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('files');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should allow admin to access files without channel assignment', async () => {
      const response = await request(app)
        .get('/api/files')
        .query({ channelId: testChannel.id, page: 1, limit: 20 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject access for user without channel access', async () => {
      // Create a new channel without assigning the user
      const newChannel = await prisma.channel.create({
        data: {
          name: 'Private Channel',
          slug: 'private-channel',
          ftpPath: '/private',
        },
      });

      const response = await request(app)
        .get('/api/files')
        .query({ channelId: newChannel.id, page: 1, limit: 20 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');

      // Clean up
      await prisma.channel.delete({ where: { id: newChannel.id } });
    });
  });

  describe('GET /api/files/search', () => {
    it('should search files in channel', async () => {
      const response = await request(app)
        .get('/api/files/search')
        .query({
          channelId: testChannel.id,
          query: 'test',
          page: 1,
          limit: 20,
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('files');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should reject search with empty query', async () => {
      const response = await request(app)
        .get('/api/files/search')
        .query({
          channelId: testChannel.id,
          query: '',
          page: 1,
          limit: 20,
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('DELETE /api/files/:fileId', () => {
    it('should handle file deletion (requires actual file)', async () => {
      const response = await request(app)
        .delete('/api/files/non-existent-file-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500); // Will fail because file doesn't exist
      expect(response.body.error).toContain('not found');
    });
  });
});

describe('File Validation', () => {
  describe('Chunk Upload', () => {
    let uploadId: string;

    beforeEach(async () => {
      // Initialize upload
      const response = await request(app)
        .post('/api/files/upload/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'chunked.txt',
          mimeType: 'text/plain',
          size: 10 * 1024, // 10KB (2 chunks of 5KB each)
          channelId: testChannel.id,
        });

      uploadId = response.body.data.uploadId;
    });

    it('should reject chunk upload without file data', async () => {
      const response = await request(app)
        .post('/api/files/upload/chunk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          uploadId,
          chunkIndex: 0,
          totalChunks: 2,
          chunkSize: 5 * 1024,
          totalSize: 10 * 1024,
          filename: 'chunked.txt',
          mimeType: 'text/plain',
          channelId: testChannel.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No file chunk provided');
    });

    it('should reject chunk upload with invalid chunk index', async () => {
      const chunkData = Buffer.alloc(5 * 1024, 'test data');
      
      const response = await request(app)
        .post('/api/files/upload/chunk')
        .set('Authorization', `Bearer ${authToken}`)
        .field('uploadId', uploadId)
        .field('chunkIndex', 5) // Invalid index
        .field('totalChunks', 2)
        .field('chunkSize', 5 * 1024)
        .field('totalSize', 10 * 1024)
        .field('filename', 'chunked.txt')
        .field('mimeType', 'text/plain')
        .field('channelId', testChannel.id)
        .attach('chunk', chunkData, 'chunk.bin');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid chunk index');
    });
  });
});
