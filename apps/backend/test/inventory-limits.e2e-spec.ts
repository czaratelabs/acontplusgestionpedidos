/**
 * 2.1.5.2 - Flujo gestión inventario (crear artículo, buscar)
 * 2.1.5.3 - Flujo planes/límites (límite de recursos)
 *
 * Requiere DB con migraciones y seed (npm run seed) con:
 *   SEED_SUPER_ADMIN_EMAIL, SEED_SUPER_ADMIN_PASSWORD
 * Define también E2E_SUPER_ADMIN_EMAIL, E2E_SUPER_ADMIN_PASSWORD en .env para estos tests.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { bootstrapE2eApp } from './e2e-utils';

const superAdminEmail = process.env.E2E_SUPER_ADMIN_EMAIL || process.env.SEED_SUPER_ADMIN_EMAIL;
const superAdminPassword =
  process.env.E2E_SUPER_ADMIN_PASSWORD || process.env.SEED_SUPER_ADMIN_PASSWORD;
const hasSuperAdmin = !!(superAdminEmail && superAdminPassword);

describe('Inventory & Limits e2e (2.1.5.2, 2.1.5.3)', () => {
  let app: INestApplication<App>;
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const uniqueRuc = String(Math.floor(1000000000000 + Math.random() * 8999999999999));
  const testUser = {
    company_name: `Empresa Inv ${uniqueId}`,
    company_ruc_nit: uniqueRuc,
    full_name: 'Usuario Inventario',
    email: `inv-${uniqueId}@test.local`,
    password: 'password123',
  };

  let companyId: string;
  let userToken: string;
  let superAdminToken: string;

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

  beforeAll(
    async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);
      companyId = registerRes.body.companyId;

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);
      userToken = loginRes.body.access_token;
    },
    hasSuperAdmin ? 20000 : 5000,
  );

  beforeAll(
    async () => {
      if (!hasSuperAdmin) return;
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: superAdminEmail, password: superAdminPassword })
        .expect(200);
      superAdminToken = loginRes.body.access_token;
    },
    15000,
  );

  it(
    '2.1.5.2 - crea artículo y busca (requiere Super Admin para asignar plan)',
    async () => {
      if (!hasSuperAdmin) {
        return; // skip: sin Super Admin no se puede asignar plan con logistics
      }

      const plansRes = await request(app.getHttpServer())
        .get('/subscription-plans')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const planWithLogistics = (plansRes.body as Array<{ id: string; modules?: Record<string, boolean> }>).find(
        (p) => p.modules?.logistics === true,
      );
      expect(planWithLogistics).toBeDefined();

      const startDate = new Date().toISOString().slice(0, 10);
      const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      await request(app.getHttpServer())
        .patch(`/companies/${companyId}/subscription`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          planId: planWithLogistics!.id,
          startDate,
          endDate,
          period: 'annual',
        })
        .expect(200);

      const createRes = await request(app.getHttpServer())
        .post(`/articles/company/${companyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: `ART-E2E-${uniqueId}`,
          name: `Artículo E2E ${uniqueId}`,
          variants: [{ sku: `SKU-${uniqueId}`, barcode: `BAR-${uniqueId}` }],
        })
        .expect(201);

      expect(createRes.body).toHaveProperty('id');

      const searchRes = await request(app.getHttpServer())
        .get(`/articles/company/${companyId}/search`)
        .query({ q: `SKU-${uniqueId}` })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(searchRes.body).toBeDefined();
      if (searchRes.body) {
        expect(searchRes.body).toHaveProperty('id');
      }
    },
    25000,
  );

  it(
    '2.1.5.3 - obtiene limit-info de establecimientos (requiere plan con admin_establishments)',
    async () => {
      if (!hasSuperAdmin) {
        return; // skip: requiere plan asignado
      }

      const res = await request(app.getHttpServer())
        .get(`/establishments/company/${companyId}/limit-info`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        count: expect.any(Number),
        limit: expect.any(Number),
      });
    },
    15000,
  );
});
