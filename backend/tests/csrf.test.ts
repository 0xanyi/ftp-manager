import request from 'supertest';
import bcrypt from 'bcryptjs';
import app, { prisma } from '../src/app';
import { setupTestDb, cleanupTestDb } from './helpers';

describe('CSRF Protection', () => {
  const testEmail = 'csrf-user@test.com';
  const testPassword = 'Password123!';

  beforeAll(async () => {
    await setupTestDb();

    const passwordHash = await bcrypt.hash(testPassword, 12);
    await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        role: 'CHANNEL_USER',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  it('should return a CSRF token', async () => {
    const response = await request(app)
      .get('/api/security/csrf-token')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(typeof response.body.data.token).toBe('string');
  });

  it('should reject state-changing requests without CSRF token', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(403);
  });

  it('should accept state-changing requests with valid CSRF token', async () => {
    const tokenResponse = await request(app)
      .get('/api/security/csrf-token')
      .expect(200);

    const token = String(tokenResponse.body.data.token);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .set('x-csrf-token', token)
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
  });

  it('should reject reuse of a CSRF token', async () => {
    const tokenResponse = await request(app)
      .get('/api/security/csrf-token')
      .expect(200);

    const token = String(tokenResponse.body.data.token);

    await request(app)
      .post('/api/auth/login')
      .set('x-csrf-token', token)
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(200);

    await request(app)
      .post('/api/auth/login')
      .set('x-csrf-token', token)
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(403);
  });
});
