/**
 * 2.1.5.1 - Flujo login → token → request protegido
 * Requiere DB con migraciones aplicadas. No requiere seed.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { bootstrapE2eApp } from './e2e-utils';

describe('Auth e2e (2.1.5.1)', () => {
  let app: INestApplication<App>;
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const uniqueRuc = String(Math.floor(1000000000000 + Math.random() * 8999999999999));
  const testUser = {
    company_name: `Empresa E2E ${uniqueId}`,
    company_ruc_nit: uniqueRuc,
    full_name: 'Usuario E2E',
    email: `e2e-${uniqueId}@test.local`,
    password: 'password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapE2eApp(app);
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('rechaza login con credenciales inválidas', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'noexiste@test.local', password: 'wrong' })
      .expect(401);
  });

  it(
    'registra usuario y permite login',
    async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(registerRes.body).toHaveProperty('companyId');

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(loginRes.body).toMatchObject({
        access_token: expect.any(String),
        user: expect.objectContaining({
          id: expect.any(String),
          email: testUser.email,
          companyId: expect.any(String),
        }),
      });
    },
    15000,
  );

  it('rechaza request protegido sin token', () => {
    return request(app.getHttpServer())
      .get('/subscription-plans')
      .expect(401);
  });

  it(
    'acepta request protegido con token',
    async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      const token = loginRes.body.access_token;
      expect(token).toBeDefined();

      return request(app.getHttpServer())
        .get('/subscription-plans')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    },
    15000,
  );
});
