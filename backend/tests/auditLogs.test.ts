import request from 'supertest';
import bcrypt from 'bcryptjs';
import app, { prisma } from '../src/app';
import { setupTestDb, cleanupTestDb } from './helpers';

const getCsrfToken = async () => {
  const response = await request(app)
    .get('/api/security/csrf-token')
    .expect(200);

  return String(response.body.data.token);
};

describe('Audit Logging', () => {
  const userEmail = 'audit-user@test.com';
  const adminEmail = 'audit-admin@test.com';
  const password = 'Password123!';
  let adminAccessToken: string;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

    await setupTestDb();

    const passwordHash = await bcrypt.hash(password, 12);

    // Create regular user
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        role: 'CHANNEL_USER',
        isActive: true,
      },
    });

    // Create admin user
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  it('records an audit log on successful login', async () => {
    const csrfToken = await getCsrfToken();

    await request(app)
      .post('/api/auth/login')
      .set('x-csrf-token', csrfToken)
      .send({
        email: userEmail,
        password,
      })
      .expect(200);

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        actorEmail: userEmail,
        action: 'LOGIN_SUCCESS',
      },
    });

    expect(auditLogs.length).toBeGreaterThan(0);
  });

  it('returns audit logs via the admin endpoint', async () => {
    const loginCsrf = await getCsrfToken();

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .set('x-csrf-token', loginCsrf)
      .send({
        email: adminEmail,
        password,
      })
      .expect(200);

    adminAccessToken = loginResponse.body.data.tokens.accessToken;

    // Seed an additional audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'TEST_EVENT',
        actorEmail: adminEmail,
        entityType: 'SYSTEM',
        metadata: { info: 'seeded for admin audit endpoint test' },
      },
    });

    const response = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.logs.length).toBeGreaterThan(0);
    expect(response.body.data.pagination).toBeDefined();
  });
});
