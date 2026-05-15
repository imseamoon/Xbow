import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, BrowserContext } from 'playwright';
import type {
  AuthConfig,
  AuthSession,
  AuthResult,
  PlaywrightStorageState,
} from '../common/interfaces/auth.interface';

const USERNAME_SELECTORS = [
  'input[name="username"]',
  'input[name="user"]',
  'input[name="email"]',
  'input[type="email"]',
  'input[id*="user"]',
  'input[id*="email"]',
  'input[placeholder*="username" i]',
  'input[placeholder*="email" i]',
];

const PASSWORD_SELECTORS = [
  'input[name="password"]',
  'input[name="pass"]',
  'input[type="password"]',
  'input[id*="pass"]',
  'input[placeholder*="password" i]',
];

const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button:has-text("Login")',
  'button:has-text("Log in")',
  'button:has-text("Sign in")',
  'button:has-text("Submit")',
  '[role="button"]:has-text("Login")',
  '[role="button"]:has-text("Sign in")',
];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  async login(config: AuthConfig): Promise<AuthResult> {
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      context = await browser.newContext({
        ignoreHTTPSErrors: true,
        userAgent: 'RedSentinel/1.0 (Security Scanner)',
      });

      const page = await context.newPage();

      this.logger.log(`navigating to login page: ${config.loginUrl}`);
      await page.goto(config.loginUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      });

      const usernameSelector = config.usernameSelector
        ? config.usernameSelector
        : await this.detectSelector(page, USERNAME_SELECTORS);

      if (!usernameSelector) {
        return { success: false, error: 'Could not locate username field on login page' };
      }

      await page.fill(usernameSelector, config.username);

      const passwordSelector = config.passwordSelector
        ? config.passwordSelector
        : await this.detectSelector(page, PASSWORD_SELECTORS);

      if (!passwordSelector) {
        return { success: false, error: 'Could not locate password field on login page' };
      }

      await page.fill(passwordSelector, config.password);

      const submitSelector = config.submitSelector
        ? config.submitSelector
        : await this.detectSelector(page, SUBMIT_SELECTORS);

      const urlBeforeSubmit = page.url();

      if (submitSelector) {
        await page.click(submitSelector);
      } else {
        await page.press(passwordSelector, 'Enter');
      }

      const waitMs = config.postLoginWaitMs ?? 3000;

      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForFunction(
        (prev) => window.location.href !== prev,
        urlBeforeSubmit,
        { timeout: waitMs + 5000 }
      ).catch(() => {});
      await page.waitForTimeout(waitMs);

      const urlAfterSubmit = page.url();

      const loginFailed = await this.detectLoginFailure(
        page,
        urlBeforeSubmit,
        urlAfterSubmit,
        config.successUrlContains,
      );

      if (loginFailed) {
        return { success: false, error: loginFailed };
      }

      const storageState = (await context.storageState()) as PlaywrightStorageState;
      const cookieHeader = storageState.cookies
        .filter(() => true)
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');

      const session: AuthSession = {
        storageState,
        cookieHeader,
        createdAt: new Date(),
      };

      this.logger.log(
        `login successful: ${storageState.cookies.length} cookies captured`,
      );

      return { success: true, session };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`login automation error: ${msg}`);
      return { success: false, error: `Login automation error: ${msg}` };
    } finally {
      if (context) {
        try { await context.close(); } catch { /* ignore */ }
      }
      if (browser) {
        try { await browser.close(); } catch { /* ignore */ }
      }
    }
  }

  async createAuthenticatedContext(
    browser: Browser,
    session: AuthSession,
  ): Promise<BrowserContext> {
    return browser.newContext({
      storageState: session.storageState as any,
      ignoreHTTPSErrors: true,
      userAgent: 'RedSentinel/1.0 (Security Scanner)',
    });
  }

  buildAuthHeaders(session: AuthSession): Record<string, string> {
    if (!session.cookieHeader) return {};
    return { Cookie: session.cookieHeader };
  }

  private async detectSelector(
    page: import('playwright').Page,
    candidates: string[],
  ): Promise<string | null> {
    for (const sel of candidates) {
      try {
        const el = await page.$(sel);
        if (el) return sel;
      } catch { /* ignore */ }
    }
    return null;
  }

  private async detectLoginFailure(
    page: import('playwright').Page,
    urlBefore: string,
    urlAfter: string,
    successUrlContains?: string,
  ): Promise<string | null> {
    if (successUrlContains && !urlAfter.includes(successUrlContains)) {
      return `Login did not redirect to expected URL (expected "${successUrlContains}", got "${urlAfter}")`;
    }

    if (urlBefore === urlAfter && !successUrlContains) {
      const bodyText = await page.textContent('body').catch(() => '');
      const lowerBody = (bodyText ?? '').toLowerCase();
      const errorKeywords = [
        'invalid password', 'wrong password', 'incorrect password',
        'invalid credentials', 'login failed', 'authentication failed',
        'username or password', 'invalid username',
      ];
      for (const kw of errorKeywords) {
        if (lowerBody.includes(kw)) {
          return `Login failed: page contains error message matching "${kw}"`;
        }
      }
      this.logger.warn(
        'URL did not change after login submit — may be SPA or error; continuing with captured session',
      );
    }

    return null;
  }
}
