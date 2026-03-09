/**
 * Smoke test e2e — verifica que la API responde.
 * AppModule no expone GET /; se usa un endpoint protegido para validar el arranque.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('rechaza GET /subscription-plans sin token (401)', () => {
    return request(app.getHttpServer())
      .get('/subscription-plans')
      .expect(401);
  });
});
