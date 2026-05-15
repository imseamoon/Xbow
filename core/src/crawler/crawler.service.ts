import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, Browser } from 'playwright';
import { WafDetectorService } from './waf-detector.service';
import { DomAnalyzerService } from './dom-analyzer.service';
import {
  CrawlResult,
  DiscoveredParam,
} from '../common/interfaces/crawler.interface';
import { isSameDomain, isAbsoluteUrl } from '../common/utils/url.utils';
import type { AuthSession } from '../common/interfaces/auth.interface';

@Injectable()
export class CrawlerService implements OnModuleDestroy {
  private readonly logger = new Logger(CrawlerService.name);
  private browser: Browser | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly wafDetector: WafDetectorService,
    private readonly domAnalyzer: DomAnalyzerService,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser && !this.browser.isConnected()) {
      this.logger.warn('browser disconnected — relaunching');
      this.browser = null;
    }
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.logger.log('browser launched');
    }
    return this.browser;
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('browser closed');
    }
  }

  /**
   * Crawl the target. When `authSession` is provided the browser context
   * is pre-loaded with the saved cookies/localStorage so authenticated
   * pages are accessible.
   */
  async crawl(
    url: string,
    depth: number,
    maxParams: number,
    authSession?: AuthSession,
  ): Promise<CrawlResult> {
    const startedAt = Date.now();
    const visited = new Set<string>();
    const toVisit: { url: string; currentDepth: number }[] = [
      { url, currentDepth: 0 },
    ];
    const allParams: DiscoveredParam[] = [];
    const allForms: import('../common/interfaces/crawler.interface').DiscoveredForm[] = [];
    const allScripts: string[] = [];
    const paramNames = new Set<string>();
    const formKeys = new Set<string>();

    const maxUrls = Math.max(
      this.config.get<number>('CRAWLER_MAX_URLS', 80),
      10,
    );
    const crawlTimeoutMs = this.config.get<number>('CRAWLER_TIMEOUT_MS', 60000);
    const visitedPatterns = new Map<string, number>();

    const browser = await this.getBrowser();

    // Build context options — inject saved auth state when available
    const contextOptions: Parameters<Browser['newContext']>[0] = {
      userAgent: this.config.get<string>(
        'CRAWLER_USER_AGENT',
        'RedSentinel/1.0 (Security Scanner)',
      ),
      ignoreHTTPSErrors: true,
    };

    if (authSession?.storageState) {
      contextOptions.storageState = authSession.storageState as any;
      this.logger.log(
        `crawl context loaded with ${authSession.storageState.cookies.length} auth cookies`,
      );
    }

    const context = await browser.newContext(contextOptions);

    // capture waf on the first request
    let wafResult = { detected: false, name: null as string | null, confidence: 0 };
    let wafChecked = false;

    try {
      while (
        toVisit.length > 0 &&
        paramNames.size < maxParams &&
        visited.size < maxUrls &&
        Date.now() - startedAt < crawlTimeoutMs
      ) {
        const item = toVisit.shift()!;
        const normalized = this.normalizeForVisit(item.url);

        if (visited.has(normalized)) continue;

        const MAX_PER_PATTERN = 5;
        const pattern = this.urlToPattern(item.url);
        const patternCount = visitedPatterns.get(pattern) ?? 0;
        if (patternCount >= MAX_PER_PATTERN && item.currentDepth > 0) continue;
        visitedPatterns.set(pattern, patternCount + 1);

        visited.add(normalized);
        this.logger.debug(`crawling: ${item.url} (depth=${item.currentDepth})`);

        const page = await context.newPage();
        try {
          const response = await page.goto(item.url, {
            waitUntil: 'domcontentloaded',
            timeout: 15000,
          });

          if (!response) continue;

          if (!wafChecked) {
            const headers: Record<string, string> = {};
            for (const [k, v] of Object.entries(response.headers())) {
              headers[k.toLowerCase()] = v;
            }
            const cookies = await context.cookies();
            const cookieStrings = cookies.map((c) => `${c.name}=${c.value}`);
            const body = await page.content();
            wafResult = this.wafDetector.detect(headers, body, cookieStrings);
            wafChecked = true;
          }

          // Check for login redirect — if we ended up on a login page despite
          // having auth session, log a warning but continue
          if (authSession?.storageState) {
            const currentUrl = page.url();
            const isLoginPage = await this.detectLoginRedirect(page, currentUrl);
            if (isLoginPage) {
              this.logger.warn(
                `possible auth redirect detected at ${currentUrl} — session may have expired`,
              );
            }
          }

          const frames = page.frames();
          for (const frame of frames) {
            const frameUrl = frame.url();
            if (!frameUrl || frameUrl === 'about:blank') continue;

            visited.add(this.normalizeForVisit(frameUrl));

            try {
              await frame.waitForLoadState('load', { timeout: 8000 });
            } catch {
              // frame timed out
            }

            let frameHtml: string;
            try {
              frameHtml = await frame.content();
            } catch {
              continue;
            }

            const effectiveUrl = frameUrl || item.url;

            const frameParams = this.domAnalyzer.extractParams(effectiveUrl, frameHtml);
            for (const p of frameParams) {
              if (!paramNames.has(p.name) && paramNames.size < maxParams) {
                paramNames.add(p.name);
                allParams.push(p);
              }
            }

            const frameForms = this.domAnalyzer.extractForms(frameHtml, effectiveUrl);
            for (const form of frameForms) {
              const formKey = `${form.action}|${form.method}|${form.fields.sort().join(',')}`;
              if (!formKeys.has(formKey)) {
                formKeys.add(formKey);
                allForms.push(form);
              }
            }

            try {
              const frameScripts = await frame.evaluate(() => {
                const els = document.querySelectorAll('script:not([src])');
                return Array.from(els).map((el) => el.textContent ?? '');
              });
              allScripts.push(...frameScripts);

              const externalSrcs = await frame.evaluate(() =>
                Array.from(document.querySelectorAll('script[src]')).map(
                  (el) => el.getAttribute('src') ?? '',
                ),
              );
              for (const src of externalSrcs) {
                try {
                  const absUrl = new URL(src, effectiveUrl).toString();
                  if (isSameDomain(url, absUrl)) {
                    const text = await frame.evaluate(async (scriptUrl: string) => {
                      const r = await fetch(scriptUrl);
                      return r.text();
                    }, absUrl);
                    allScripts.push(text);
                  }
                } catch {
                  // unreachable script
                }
              }
            } catch {
              // frame detached
            }
          }

          if (item.currentDepth < depth) {
            for (const frame of frames) {
              const frameUrl = frame.url();
              if (!frameUrl || !isSameDomain(url, frameUrl)) continue;
              try {
                const links = await frame.evaluate(() =>
                  Array.from(document.querySelectorAll('a[href]')).map(
                    (a) => (a as HTMLAnchorElement).href,
                  ),
                );
                for (const link of links) {
                  if (
                    isAbsoluteUrl(link) &&
                    isSameDomain(url, link) &&
                    !visited.has(this.normalizeForVisit(link))
                  ) {
                    toVisit.push({ url: link, currentDepth: item.currentDepth + 1 });
                  }
                }
              } catch {
                // cross-origin frame
              }
            }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'unknown';
          this.logger.warn(`failed to crawl ${item.url}: ${errorMessage}`);
        } finally {
          await page.close();
        }
      }

      const domSinks = this.domAnalyzer.scanDomSinks(allScripts);
      const durationMs = Date.now() - startedAt;

      const result: CrawlResult = {
        baseUrl: url,
        urls: Array.from(visited),
        params: allParams,
        forms: allForms,
        domSinks,
        waf: wafResult,
        durationMs,
      };

      this.logger.log(
        `crawl complete: ${visited.size} urls, ${allParams.length} params, ` +
        `${domSinks.length} sinks, ${durationMs}ms` +
        (authSession ? ' [authenticated]' : ''),
      );

      return result;
    } finally {
      await context.close();
    }
  }

  private async detectLoginRedirect(
    page: import('playwright').Page,
    currentUrl: string,
  ): Promise<boolean> {
    const loginIndicators = ['/login', '/signin', '/auth/login', '/account/login'];
    const urlLower = currentUrl.toLowerCase();
    if (loginIndicators.some((ind) => urlLower.includes(ind))) return true;

    try {
      const hasPasswordField = await page.$('input[type="password"]');
      if (hasPasswordField) return true;
    } catch {
      // page may have navigated
    }

    return false;
  }

  private normalizeForVisit(raw: string): string {
    try {
      const u = new URL(raw);
      u.hash = '';
      return u.toString().replace(/\/$/, '');
    } catch {
      return raw;
    }
  }

  private urlToPattern(raw: string): string {
    try {
      const u = new URL(raw);
      const segments = u.pathname.split('/').map((seg) => {
        if (!seg) return seg;
        if (/^\d+$/.test(seg)) return '{id}';
        if (/^[a-f0-9-]{8,}$/i.test(seg)) return '{uuid}';
        if (seg.length > 3 && /[A-Z]/.test(seg) && /[a-z]/.test(seg))
          return '{slug}';
        return seg;
      });
      return `${u.origin}${segments.join('/')}`;
    } catch {
      return raw;
    }
  }
}