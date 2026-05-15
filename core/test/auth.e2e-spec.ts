import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ScanProcessor } from '../src/queue/scan.processor';
import { ScanService } from '../src/scan/scan.service';
import { ScanGateway } from '../src/scan/scan.gateway';
import { CrawlerService } from '../src/crawler/crawler.service';
import { ContextClientService } from '../src/modules-bridge/context-client.service';
import { PayloadClientService } from '../src/modules-bridge/payload-client.service';
import { FuzzerClientService } from '../src/modules-bridge/fuzzer-client.service';
import { ReportService } from '../src/report/report.service';
import { AuthService } from '../src/userauth/auth.service';
import { ScannerLogService } from '../src/scanner-log/scanner-log.service';
import { ScanStatus, ScanPhase } from '../src/common/interfaces/scan.interface';
import type { AuthSession } from '../src/common/interfaces/auth.interface';
import { SCAN_QUEUE } from '../src/queue/scan.producer';

// ── Shared mock factories ────────────────────────────────────────────────────

const makeSession = (overrides: Partial<AuthSession> = {}): AuthSession => ({
  storageState: {
    cookies: [
      { name: 'session', value: 'tok123', domain: 'target.com', path: '/', expires: -1, httpOnly: true, secure: true, sameSite: 'Lax' },
    ],
    origins: [],
  },
  cookieHeader: 'session=tok123',
  createdAt: new Date(),
  ...overrides,
});

const makeScan = (authEnabled: boolean, extra: Record<string, unknown> = {}) => ({
  id: 'scan-001',
  url: 'https://target.com',
  status: ScanStatus.PENDING,
  progress: 0,
  options: {
    depth: 2,
    maxParams: 50,
    verifyExecution: true,
    wafBypass: false,
    maxPayloadsPerParam: 10,
    timeout: 30000,
    reportFormat: ['json'],
    singlePage: false,
    ...(authEnabled && {
      auth: {
        enabled: true,
        loginUrl: 'https://target.com/login',
        username: 'user',
        password: 'pass',
      },
    }),
    ...extra,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeJob = (scanId: string): Partial<Job<{ scanId: string }>> => ({
  data: { scanId },
  id: `job-${scanId}`,
  name: 'scan',
});

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockScanService = {
  findOne: jest.fn(),
  updateStatus: jest.fn().mockResolvedValue(undefined),
  addVuln: jest.fn().mockResolvedValue(true),
  getVulns: jest.fn().mockResolvedValue([]),
  markFailed: jest.fn().mockResolvedValue(undefined),
  addAuditLog: jest.fn().mockResolvedValue(undefined),
  getAuditLogs: jest.fn().mockResolvedValue([]),
};

const mockGateway = {
  emitProgress: jest.fn(),
  emitFinding: jest.fn(),
  emitComplete: jest.fn(),
  emitError: jest.fn(),
};

const mockCrawler = {
  crawl: jest.fn().mockResolvedValue({
    baseUrl: 'https://target.com',
    urls: ['https://target.com/?q=1'],
    params: [{ name: 'q', source: 'url' }],
    forms: [],
    domSinks: [],
    waf: { detected: false, name: null, confidence: 0 },
    durationMs: 100,
  }),
};

const mockContextClient = {
  analyze: jest.fn().mockResolvedValue({
    q: { reflects_in: 'html_body', allowed_chars: ['<', '>'], context_confidence: 0.9 },
  }),
};

const mockPayloadClient = {
  generate: jest.fn().mockResolvedValue({
    payloads: [{ payload: '<script>alert(1)</script>', target_param: 'q', type: 'reflected' }],
  }),
};

const mockFuzzerClient = {
  test: jest.fn().mockResolvedValue({
    results: [
      {
        payload: '<script>alert(1)</script>',
        target_param: 'q',
        reflected: true,
        executed: true,
        vuln: true,
        type: 'reflected',
        evidence: { response_code: 200, reflection_position: 'body', browser_alert_triggered: true },
      },
    ],
  }),
};

const mockReportService = {
  generate: jest.fn().mockResolvedValue('/reports/scan-001.html'),
  buildVuln: jest.fn().mockReturnValue({ id: 'vuln-1', type: 'reflected', url: 'https://target.com' }),
};

const mockAuthService = {
  login: jest.fn(),
  buildAuthHeaders: jest.fn().mockReturnValue({ Cookie: 'session=tok123' }),
  createAuthenticatedContext: jest.fn(),
};

const mockScannerLog = {
  append: jest.fn(),
  flush: jest.fn(),
};

// ── Test Suite ───────────────────────────────────────────────────────────────

describe('ScanProcessor — auth phase integration', () => {
  let processor: ScanProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScanProcessor,
        { provide: ScanService, useValue: mockScanService },
        { provide: ScanGateway, useValue: mockGateway },
        { provide: CrawlerService, useValue: mockCrawler },
        { provide: ContextClientService, useValue: mockContextClient },
        { provide: PayloadClientService, useValue: mockPayloadClient },
        { provide: FuzzerClientService, useValue: mockFuzzerClient },
        { provide: ReportService, useValue: mockReportService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ScannerLogService, useValue: mockScannerLog },
        { provide: getQueueToken(SCAN_QUEUE), useValue: {} },
      ],
    }).compile();

    processor = module.get<ScanProcessor>(ScanProcessor);
    jest.clearAllMocks();

    // Restore stable defaults after clearAllMocks
    mockScanService.updateStatus.mockResolvedValue(undefined);
    mockScanService.addVuln.mockResolvedValue(true);
    mockScanService.getVulns.mockResolvedValue([]);
    mockScanService.markFailed.mockResolvedValue(undefined);
    mockCrawler.crawl.mockResolvedValue({
      baseUrl: 'https://target.com',
      urls: ['https://target.com/?q=1'],
      params: [{ name: 'q', source: 'url' }],
      forms: [],
      domSinks: [],
      waf: { detected: false, name: null, confidence: 0 },
      durationMs: 100,
    });
    mockContextClient.analyze.mockResolvedValue({
      q: { reflects_in: 'html_body', allowed_chars: ['<', '>'], context_confidence: 0.9 },
    });
    mockPayloadClient.generate.mockResolvedValue({
      payloads: [{ payload: '<script>alert(1)</script>', target_param: 'q', type: 'reflected' }],
    });
    mockFuzzerClient.test.mockResolvedValue({ results: [] });
    mockReportService.generate.mockResolvedValue('/reports/scan-001.html');
    mockReportService.buildVuln.mockReturnValue({ id: 'vuln-1', type: 'reflected', url: 'https://target.com' });
  });

  // ── Auth disabled ─────────────────────────────────────────────────────

  describe('when auth is disabled', () => {
    it('skips AuthService.login entirely', async () => {
      mockScanService.findOne.mockResolvedValue(makeScan(false));

      await processor.process(makeJob('scan-001') as Job<{ scanId: string }>);

      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('calls crawler WITHOUT authSession', async () => {
      mockScanService.findOne.mockResolvedValue(makeScan(false));

      await processor.process(makeJob('scan-001') as Job<{ scanId: string }>);

      expect(mockCrawler.crawl).toHaveBeenCalledWith(
        'https://target.com',
        expect.any(Number),
        expect.any(Number),
        undefined, // ← no auth session
      );
    });

    it('completes scan successfully without auth', async () => {
      mockScanService.findOne.mockResolvedValue(makeScan(false));

      await processor.process(makeJob('scan-001') as Job<{ scanId: string }>);

      expect(mockGateway.emitComplete).toHaveBeenCalledWith(
        expect.objectContaining({ scanId: 'scan-001' }),
      );
      expect(mockScanService.markFailed).not.toHaveBeenCalled();
    });
  });

  // ── Auth enabled: success ─────────────────────────────────────────────

  describe('when auth is enabled and login succeeds', () => {
    const session = makeSession();

    beforeEach(() => {
      mockAuthService.login.mockResolvedValue({ success: true, session });
      mockScanService.findOne.mockResolvedValue(makeScan(true));
    });

    it('calls AuthService.login with correct config', async () => {
      await processor.process(makeJob('scan-001') as Job<{ scanId: string }>);

      expect(mockAuthService.login).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          loginUrl: 'https://target.com/login',
          username: 'user',
          password: 'pass',
        }),
      );
    });

    it('emits AUTH phase progress before crawling', async () => {
      await processor.process(makeJob('scan-001') as Job<{ scanId: string }>);

      const authEmit = mockGateway.emitProgress.mock.calls.find(
        ([p]: [any]) => p.phase === ScanPhase.AUTH,
      );
      expect(authEmit).toBeDefined();
    });

    it('emits authenticated success progress message', async () => {
      await processor.process(makeJob('scan-001') as Job<{ scanId: string }>);

      const authCalls = mockGateway.emitProgress.mock.calls.filter(
        ([p]: [any]) => p.phase === ScanPhase.AUTH,
      );
      const successCall = authCalls.find(([p]: [any]) =>
        typeof p.message === 'string' && p.message.includes('authenticated'),
      );
      expect(successCall).toBeDefined();
    });

    it('passes authSession to crawler', async () => {
      await processor.process(makeJob('scan-001') as Job<{ scanId: string }>);

      expect(mockCrawler.crawl).toHaveBeenCalledWith(
        'https://target.com',
        expect.any(Number),
        expect.any(Number),
        session, // ← session passed
      );
    });

    it('passes authSession to contextClient.analyze', async () => {
      await processor.process(makeJob('scan-001') as Job<{ scanId: string }>);

      expect(mockContextClient.analyze).toHaveBeenCalledWith(
        expect.any(Object),
        session,
      );
    });

    it('passes authSession to fuzzerClient.test', async () => {
      mockFuzzerClient.test.mockResolvedValue({ results: [] });

      await processor.process(makeJob('scan-001') as Job<{ scanId: string }>);

      expect(mockFuzzerClient.test).toHaveBeenCalledWith(
        expect.any(Object),
        session,
      );
    });

    it('completes scan successfully after auth', async () => {
      await processor.process(makeJob('scan-001') as Job<{ scanId: string }>);

      expect(mockGateway.emitComplete).toHaveBeenCalledWith(
        expect.objectContaining({ scanId: 'scan-001' }),
      );
    });

    it('emits [authenticated] tag in crawl progress message', async () => {
      await processor.process(makeJob('scan-001') as Job<{ scanId: string }>);

      const crawlEmits = mockGateway.emitProgress.mock.calls.filter(
        ([p]: [any]) => p.phase === ScanPhase.CRAWL,
      );
      const authedEmit = crawlEmits.find(([p]: [any]) =>
        typeof p.message === 'string' && p.message.includes('authenticated'),
      );
      expect(authedEmit).toBeDefined();
    });
  });

  // ── Auth enabled: login failure ───────────────────────────────────────

  describe('when auth is enabled but login fails', () => {
    beforeEach(() => {
      mockAuthService.login.mockResolvedValue({
        success: false,
        error: 'Could not locate username field on login page',
      });
      mockScanService.findOne.mockResolvedValue(makeScan(true));
    });

    it('does NOT abort the scan — falls back to unauthenticated', async () => {
      await processor.process(makeJob('scan-001') as Job<{ scanId: string }>);

      // scan should still complete
      expect(mockGateway.emitComplete).toHaveBeenCalled();
      expect(mockScanService.markFailed).not.toHaveBeenCalled();
    });

    it('emits warning progress event about auth failure', async () => {
      await processor.process(makeJob('scan-001') as Job<{ scanId: string }>);

      const warnEmit = mockGateway.emitProgress.mock.calls.find(
        ([p]: [any]) =>
          p.phase === ScanPhase.AUTH &&
          typeof p.message === 'string' &&
          p.message.includes('auth failed'),
      );
      expect(warnEmit).toBeDefined();
    });

    it('crawls WITHOUT authSession after login failure', async () => {
      await processor.process(makeJob('scan-001') as Job<{ scanId: string }>);

      expect(mockCrawler.crawl).toHaveBeenCalledWith(
        'https://target.com',
        expect.any(Number),
        expect.any(Number),
        undefined, // ← no session despite auth being enabled
      );
    });
  });

  // ── Auth enabled: AuthService throws ─────────────────────────────────

  describe('when AuthService.login throws unexpectedly', () => {
    it('marks scan as failed and emits error event', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Playwright crashed'));
      mockScanService.findOne.mockResolvedValue(makeScan(true));

      await processor.process(makeJob('scan-001') as Job<{ scanId: string }>);

      expect(mockScanService.markFailed).toHaveBeenCalledWith(
        'scan-001',
        expect.stringContaining('Playwright crashed'),
      );
      expect(mockGateway.emitError).toHaveBeenCalledWith(
        'scan-001',
        expect.stringContaining('Playwright crashed'),
      );
    });
  });

  // ── Scan not found ────────────────────────────────────────────────────

  describe('when scan record is missing', () => {
    it('returns early without processing', async () => {
      mockScanService.findOne.mockRejectedValue(new Error('Not found'));

      await processor.process(makeJob('scan-missing') as Job<{ scanId: string }>);

      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(mockCrawler.crawl).not.toHaveBeenCalled();
      expect(mockGateway.emitError).not.toHaveBeenCalled();
    });
  });
});