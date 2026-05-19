/** OAuth 2.0 PKCE utilities */

const PKCE_STATE_KEY = 'oauth_pkce_state';

// ── PKCE helpers ─────────────────────────────────────────────────────────────

function randomBase64Url(byteLength: number): string {
  const arr = new Uint8Array(byteLength);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...Array.from(arr)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function sha256Base64Url(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(digest))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export interface PkceState {
  provider: string;
  codeVerifier: string;
  state: string;
  redirectUri: string;
}

export async function buildAuthorizationUrl(
  provider: string,
  clientId: string,
  authority: string,
  scopes: string[],
  redirectUri: string,
): Promise<string> {
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const state = randomBase64Url(16);

  // Persist PKCE state so the callback page can retrieve it
  const pkceState: PkceState = { provider, codeVerifier, state, redirectUri };
  sessionStorage.setItem(PKCE_STATE_KEY, JSON.stringify(pkceState));

  // Build the authorization endpoint from the authority
  const authBase = authority.includes('microsoftonline')
    ? `${authority.replace(/\/v2\.0$/, '')}/oauth2/v2.0/authorize`
    : authority.includes('google')
    ? 'https://accounts.google.com/o/oauth2/v2/auth'
    : `${authority.replace(/\/$/, '')}/v1/authorize`; // Okta / generic OIDC

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes.join(' ') || 'openid profile email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    response_mode: 'query',
  });

  return `${authBase}?${params}`;
}

export function getDefaultRedirectUri(): string {
  return `${window.location.origin}/auth/callback`;
}

export function retrievePkceState(): PkceState | null {
  const raw = sessionStorage.getItem(PKCE_STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PkceState;
  } catch {
    return null;
  }
}

export function clearPkceState(): void {
  sessionStorage.removeItem(PKCE_STATE_KEY);
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 < Date.now();
}

const AUTH_TOKEN_KEY = 'authToken';
const AUTH_USER_KEY = 'authUser';

export function storeAuth(token: string, user: any): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUser(): any | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function isAuthenticated(): boolean {
  const token = getStoredToken();
  return !!token && !isTokenExpired(token);
}
