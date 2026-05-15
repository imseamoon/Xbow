export interface AuthConfig {
  enabled: boolean;
  loginUrl: string;
  username: string;
  password: string;
  usernameSelector?: string;
  passwordSelector?: string;
  submitSelector?: string;
  /** Milliseconds to wait after clicking submit before checking success */
  postLoginWaitMs?: number;
  /** URL fragment or path that indicates a successful login */
  successUrlContains?: string;
}

export interface AuthSession {
  /** Playwright storageState — cookies + localStorage + sessionStorage */
  storageState: PlaywrightStorageState;
  /** Flat cookie string for HTTP-level requests (e.g. Axios) */
  cookieHeader: string;
  /** When the session was created */
  createdAt: Date;
}

export interface PlaywrightStorageState {
  cookies: PlaywrightCookie[];
  origins: PlaywrightOrigin[];
}

export interface PlaywrightCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

export interface PlaywrightOrigin {
  origin: string;
  localStorage: { name: string; value: string }[];
}

export type AuthResult =
  | { success: true; session: AuthSession }
  | { success: false; error: string };