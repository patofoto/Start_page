/**
 * Normalize OAuth-related bindings. Trims whitespace/BOM issues from .dev.vars / secrets.
 *
 * Redirect URI is auto-derived from the request Host header when not explicitly set,
 * eliminating the GOOGLE_REDIRECT_URI secret requirement.
 *
 * JWT_SECRET is auto-generated and stored in KV if not set as an env secret,
 * eliminating manual secret configuration.
 */
export async function getGoogleOAuthCredentials(context) {
  const env = context.env;
  let clientId = String(env.GOOGLE_CLIENT_ID ?? '').trim();
  let clientSecret = String(env.GOOGLE_CLIENT_SECRET ?? '').trim();

  // Validate that credentials look real (not placeholder dots from deploy tools)
  if (clientId && !clientId.includes('.apps.googleusercontent.com')) clientId = '';
  if (clientSecret && clientSecret.length < 10) clientSecret = '';

  // Auto-derive redirect URI from request if not explicitly set
  let redirectUri = String(env.GOOGLE_REDIRECT_URI ?? '').trim();
  if (!redirectUri && context.request) {
    const url = new URL(context.request.url);
    redirectUri = `${url.origin}/api/auth/callback`;
  }

  // Fallback: check KV for Google OAuth credentials (set via setup wizard)
  let kvClientSecret = clientSecret;
  if ((!clientId || !kvClientSecret) && env.START_PAGE_DATA) {
    try {
      const stored = await env.START_PAGE_DATA.get('_google_oauth', { type: 'json' });
      if (stored?.clientId && stored?.clientSecret) {
        if (!clientId) clientId = String(stored.clientId).trim();
        if (!kvClientSecret) kvClientSecret = String(stored.clientSecret).trim();
      }
    } catch {
      /* ignore */
    }
    // Legacy fallback
    if (!clientId) {
      try {
        const kv = await env.START_PAGE_DATA.get('authConfig', { type: 'json' });
        if (kv?.clientId) clientId = String(kv.clientId).trim();
      } catch { /* ignore */ }
    }
  }

  return { clientId, clientSecret: kvClientSecret, redirectUri };
}

/**
 * Get JWT secret. If not set as env var, auto-generate one and store in KV.
 * This eliminates the need for users to manually create and set a JWT_SECRET.
 */
export async function getJwtSecret(env) {
  const envSecret = String(env.JWT_SECRET ?? '').trim();
  if (envSecret) return envSecret;

  // Auto-generate and persist in KV
  const kv = env.START_PAGE_DATA;
  if (!kv) return '';

  const stored = await kv.get('_jwt_secret');
  if (stored) return stored;

  // Generate a random 256-bit secret
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const secret = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  await kv.put('_jwt_secret', secret);
  return secret;
}
