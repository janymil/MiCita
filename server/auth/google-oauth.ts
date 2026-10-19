import * as client from "openid-client";
import { config } from "../config.js";

/**
 * Google OAuth 2.0 (OpenID Connect) using the Authorization Code + PKCE flow.
 * `openid-client` is already a project dependency; discovery results are cached.
 */

const GOOGLE_ISSUER = new URL("https://accounts.google.com");

let cachedConfig: client.Configuration | null = null;

export function isGoogleConfigured(): boolean {
  return Boolean(config.google.clientId && config.google.clientSecret);
}

async function getConfiguration(): Promise<client.Configuration> {
  if (cachedConfig) return cachedConfig;
  if (!isGoogleConfigured()) {
    throw new Error("Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)");
  }
  cachedConfig = await client.discovery(
    GOOGLE_ISSUER,
    config.google.clientId,
    config.google.clientSecret,
  );
  return cachedConfig;
}

export interface GoogleAuthRequest {
  url: string;
  state: string;
  codeVerifier: string;
  nonce: string;
}

export async function buildGoogleAuthUrl(): Promise<GoogleAuthRequest> {
  const configuration = await getConfiguration();
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();
  const nonce = client.randomNonce();

  const url = client.buildAuthorizationUrl(configuration, {
    redirect_uri: config.google.redirectUri,
    scope: "openid email profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
    prompt: "select_account",
  });

  return { url: url.href, state, codeVerifier, nonce };
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export async function exchangeGoogleCode(
  currentUrl: URL,
  codeVerifier: string,
  expectedState: string,
  expectedNonce: string,
): Promise<GoogleUserInfo> {
  const configuration = await getConfiguration();

  const tokens = await client.authorizationCodeGrant(configuration, currentUrl, {
    pkceCodeVerifier: codeVerifier,
    expectedState,
    expectedNonce,
  });

  const claims = tokens.claims();
  if (!claims?.sub) {
    throw new Error("Google token response did not include a subject");
  }

  let email = (claims.email as string) || "";
  let name = (claims.name as string) || undefined;
  let picture = (claims.picture as string) || undefined;
  let emailVerified = Boolean(claims.email_verified);

  if (!email) {
    // Fall back to the UserInfo endpoint when claims are sparse.
    const info = await client.fetchUserInfo(configuration, tokens.access_token, claims.sub);
    email = (info.email as string) || "";
    name = name || (info.name as string) || undefined;
    picture = picture || (info.picture as string) || undefined;
    emailVerified = emailVerified || Boolean(info.email_verified);
  }

  if (!email) throw new Error("Google account did not expose an email address");

  return { sub: claims.sub, email, emailVerified, name, picture };
}
