import { getStartPageKv } from '../lib/kv.js';

/**
 * POST /api/setup/google — Save Google OAuth credentials to KV.
 * Only works during initial setup (no auth configured yet).
 */
export async function onRequestPost(context) {
  const kv = getStartPageKv(context.env);
  if (!kv) {
    return new Response(JSON.stringify({ error: 'KV not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Only allow if no password auth is set up (first-time setup)
  const passwordHash = await kv.get('_password_hash');
  const googleCreds = await kv.get('_google_oauth', { type: 'json' });
  if (passwordHash || googleCreds) {
    return new Response(JSON.stringify({ error: 'Auth already configured' }), {
      status: 403, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { clientId, clientSecret } = await context.request.json();

  if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
    return new Response(JSON.stringify({ error: 'Invalid Client ID. It should end with .apps.googleusercontent.com' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!clientSecret) {
    return new Response(JSON.stringify({ error: 'Client Secret is required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Store in KV
  await kv.put('_google_oauth', JSON.stringify({ clientId, clientSecret }));

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
