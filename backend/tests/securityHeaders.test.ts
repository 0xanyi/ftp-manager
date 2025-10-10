import request from 'supertest';

describe('security headers', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('includes WebSocket friendly connect-src directives', async () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://drop.toovy.tech';
    process.env.CSP_ADDITIONAL_CONNECT_SRC = 'wss://drop-api.toovy.tech, https://drop-api.toovy.tech';

    jest.resetModules();

    const appModule = await import('../src/app');
    const app = appModule.default;

    const response = await request(app)
      .get('/api/health')
      .expect(200);

    const header = String(response.headers['content-security-policy']);

    expect(header).toContain("connect-src");
    expect(header).toContain("'self'");
    expect(header).toContain('wss://drop-api.toovy.tech');
    expect(header).toContain('https://drop-api.toovy.tech');
    expect(header).toContain('ws:');
    expect(header).toContain('wss:');
  });
});
