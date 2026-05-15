/**
 * app-level e2e smoke test — verifies the nestjs app boots
 * and core endpoints respond.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScanController } from '../src/scan/scan.controller';
import { ScanService } from '../src/scan/scan.service';
import { ScanGateway } from '../src/scan/scan.gateway';
import { ScanQueueProducer } from '../src/queue/scan.producer';
import { ScanEntity } from '../src/scan/entities/scan.entity';
import { VulnEntity } from '../src/scan/entities/vuln.entity';
import { ScanAuditEntity } from '../src/scan/entities/scan-audit.entity';
import { JwtAuthGuard } from '../src/userauth/jwt-auth.guard';

const API_KEY = 'e2e-test-key';

describe('app e2e smoke', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ API_KEY_SECRET: API_KEY })],
        }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [ScanEntity, VulnEntity, ScanAuditEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([ScanEntity, VulnEntity, ScanAuditEntity]),
      ],
      controllers: [ScanController],
      providers: [
        ScanService,
        { provide: ScanQueueProducer, useValue: { enqueue: jest.fn() } },
        {
          provide: ScanGateway,
          useValue: {
            server: { emit: jest.fn() },
            emitProgress: jest.fn(),
            emitFinding: jest.fn(),
            emitComplete: jest.fn(),
            emitError: jest.fn(),
          },
        },
        { provide: JwtAuthGuard, useValue: { canActivate: jest.fn().mockReturnValue(true) } },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app.getHttpServer())
      .get('/health')
      .set('x-api-key', API_KEY);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('POST /scan returns 201 for valid url', async () => {
    const res = await request(app.getHttpServer())
      .post('/scan')
      .set('x-api-key', API_KEY)
      .send({ url: 'https://example.com' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('PENDING');
  });

  it('POST /scan returns 400 for invalid body', async () => {
    const res = await request(app.getHttpServer())
      .post('/scan')
      .set('x-api-key', API_KEY)
      .send({});
    expect(res.status).toBe(400);
  });

  it('GET /scans returns an array', async () => {
    const res = await request(app.getHttpServer())
      .get('/scans')
      .set('x-api-key', API_KEY);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
