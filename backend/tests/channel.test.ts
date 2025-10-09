import request from 'supertest';
import { app, prisma } from '../src/app';
import { generateTestToken, setupTestDb, cleanupTestDb } from './helpers';

const getCsrfToken = async () => {
  const response = await request(app)
    .get('/api/security/csrf-token')
    .expect(200);

  return String(response.body.data.token);
};

describe('Channel Management', () => {
  let adminToken: string;
  let userToken: string;
  let testChannelId: string;
  let testUserId: string;

  beforeAll(async () => {
    await setupTestDb();
    
    // Create test admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        passwordHash: 'hashedpassword',
        role: 'ADMIN',
      },
    });
    adminToken = generateTestToken(adminUser);

    // Create test regular user
    const testUser = await prisma.user.create({
      data: {
        email: 'user@test.com',
        passwordHash: 'hashedpassword',
        role: 'CHANNEL_USER',
      },
    });
    userToken = generateTestToken(testUser);
    testUserId = testUser.id;
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('POST /api/channels', () => {
    it('should create a channel as admin', async () => {
      const channelData = {
        name: 'Test Channel',
        description: 'Test channel description',
      };

      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-csrf-token', csrfToken)
        .send(channelData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.channel.name).toBe(channelData.name);
      expect(response.body.data.channel.slug).toBe('test-channel');
      expect(response.body.data.channel.ftpPath).toBe('/channels/test-channel');
      testChannelId = response.body.data.channel.id;
    });

    it('should fail to create channel without authentication', async () => {
      const channelData = {
        name: 'Unauthorized Channel',
      };

      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .post('/api/channels')
        .set('x-csrf-token', csrfToken)
        .send(channelData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should fail to create channel as regular user', async () => {
      const channelData = {
        name: 'User Channel',
      };

      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-csrf-token', csrfToken)
        .send(channelData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should fail to create channel with invalid name', async () => {
      const channelData = {
        name: '', // Empty name
      };

      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-csrf-token', csrfToken)
        .send(channelData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fail to create channel with duplicate name', async () => {
      const channelData = {
        name: 'Test Channel', // Same name as first test
      };

      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-csrf-token', csrfToken)
        .send(channelData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/channels', () => {
    it('should get all channels as admin', async () => {
      const response = await request(app)
        .get('/api/channels')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.channels).toBeInstanceOf(Array);
      expect(response.body.data.channels.length).toBeGreaterThan(0);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('should fail to get all channels as regular user', async () => {
      const response = await request(app)
        .get('/api/channels')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('GET /api/channels/user', () => {
    it('should return empty array for user with no assigned channels', async () => {
      const response = await request(app)
        .get('/api/channels/user')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.channels).toBeInstanceOf(Array);
      expect(response.body.data.channels.length).toBe(0);
    });

    it('should return user channels after assignment', async () => {
      // First assign user to channel
      await request(app)
        .post('/api/channels/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-csrf-token', await getCsrfToken())
        .send({
          userId: testUserId,
          channelId: testChannelId,
        })
        .expect(201);

      const response = await request(app)
        .get('/api/channels/user')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.channels).toBeInstanceOf(Array);
      expect(response.body.data.channels.length).toBe(1);
      expect(response.body.data.channels[0].id).toBe(testChannelId);
    });
  });

  describe('GET /api/channels/:id', () => {
    it('should get channel by ID as admin', async () => {
      const response = await request(app)
        .get(`/api/channels/${testChannelId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.channel.id).toBe(testChannelId);
      expect(response.body.data.channel.name).toBe('Test Channel');
    });

    it('should get channel by ID as assigned user', async () => {
      const response = await request(app)
        .get(`/api/channels/${testChannelId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.channel.id).toBe(testChannelId);
    });

    it('should fail to get non-existent channel', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/channels/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should fail with invalid channel ID format', async () => {
      const response = await request(app)
        .get('/api/channels/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/channels/:id', () => {
    it('should update channel as admin', async () => {
      const updateData = {
        name: 'Updated Channel',
        description: 'Updated description',
      };

      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .put(`/api/channels/${testChannelId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-csrf-token', csrfToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.channel.name).toBe(updateData.name);
      expect(response.body.data.channel.description).toBe(updateData.description);
      expect(response.body.data.channel.slug).toBe('updated-channel');
    });

    it('should fail to update channel as regular user', async () => {
      const updateData = {
        name: 'Unauthorized Update',
      };

      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .put(`/api/channels/${testChannelId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-csrf-token', csrfToken)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('User-Channel Assignment', () => {
    let secondUserId: string;

    beforeAll(async () => {
      // Create another test user
      const secondUser = await prisma.user.create({
        data: {
          email: 'user2@test.com',
          passwordHash: 'hashedpassword',
          role: 'CHANNEL_USER',
        },
      });
      secondUserId = secondUser.id;
    });

    it('should assign user to channel as admin', async () => {
      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .post('/api/channels/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-csrf-token', csrfToken)
        .send({
          userId: secondUserId,
          channelId: testChannelId,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userChannel.userId).toBe(secondUserId);
      expect(response.body.data.userChannel.channelId).toBe(testChannelId);
    });

    it('should fail to assign user to channel as regular user', async () => {
      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .post('/api/channels/assign')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-csrf-token', csrfToken)
        .send({
          userId: secondUserId,
          channelId: testChannelId,
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should get channel users as admin', async () => {
      const response = await request(app)
        .get(`/api/channels/${testChannelId}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.users.length).toBeGreaterThanOrEqual(2); // Both test users
    });

    it('should get available users for channel assignment', async () => {
      // Create another user that's not assigned to the channel
      const unassignedUser = await prisma.user.create({
        data: {
          email: 'unassigned@test.com',
          passwordHash: 'hashedpassword',
          role: 'CHANNEL_USER',
        },
      });

      const response = await request(app)
        .get(`/api/channels/${testChannelId}/available-users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      // Should find the unassigned user
      const foundUser = response.body.data.users.find((u: any) => u.id === unassignedUser.id);
      expect(foundUser).toBeDefined();
    });

    it('should remove user from channel as admin', async () => {
      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .post('/api/channels/remove')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-csrf-token', csrfToken)
        .send({
          userId: secondUserId,
          channelId: testChannelId,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
    });
  });

  describe('DELETE /api/channels/:id', () => {
    let channelToDeleteId: string;

    beforeAll(async () => {
      // Create a channel specifically for deletion test
      const channel = await prisma.channel.create({
        data: {
          name: 'Channel to Delete',
          slug: 'channel-to-delete',
          ftpPath: '/channels/channel-to-delete',
        },
      });
      channelToDeleteId = channel.id;
    });

    it('should delete channel as admin', async () => {
      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .delete(`/api/channels/${channelToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-csrf-token', csrfToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);

      // Verify channel is soft deleted
      const deletedChannel = await prisma.channel.findUnique({
        where: { id: channelToDeleteId },
      });
      expect(deletedChannel?.isActive).toBe(false);
    });

    it('should fail to delete channel as regular user', async () => {
      const csrfToken = await getCsrfToken();

      const response = await request(app)
        .delete(`/api/channels/${testChannelId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-csrf-token', csrfToken)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHORIZATION_ERROR');
    });
  });
});
