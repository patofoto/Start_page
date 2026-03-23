import { getAuthUser } from '../lib/auth.js';
import { getStartPageKv } from '../lib/kv.js';
import { getGoogleOAuthCredentials } from '../lib/oauth_env.js';

/**
 * GET /api/calendar — Fetch upcoming Google Calendar events.
 * Returns the next 10 events from the primary calendar.
 */
export async function onRequestGet(context) {
  const user = await getAuthUser(context);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: corsHeaders(context)
    });
  }

  const kv = getStartPageKv(context.env);
  if (!kv) {
    return new Response(JSON.stringify({ error: 'KV not configured' }), {
      status: 503, headers: corsHeaders(context)
    });
  }

  let tokens = await kv.get('_google_tokens', { type: 'json' });
  if (!tokens || !tokens.access_token) {
    return new Response(JSON.stringify({ error: 'Google not connected', needsReauth: true }), {
      status: 401, headers: corsHeaders(context)
    });
  }

  // Refresh token if expired
  if (tokens.expires_at && Date.now() > tokens.expires_at - 60000) {
    tokens = await refreshAccessToken(tokens, context, kv);
    if (!tokens) {
      return new Response(JSON.stringify({ error: 'Token refresh failed', needsReauth: true }), {
        status: 401, headers: corsHeaders(context)
      });
    }
  }

  // Fetch events
  const now = new Date().toISOString();
  const maxTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    timeMin: now,
    timeMax: maxTime,
    maxResults: '10',
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const calRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );

  if (!calRes.ok) {
    if (calRes.status === 401) {
      return new Response(JSON.stringify({ error: 'Calendar access denied', needsReauth: true }), {
        status: 401, headers: corsHeaders(context)
      });
    }
    return new Response(JSON.stringify({ error: 'Failed to fetch events' }), {
      status: 502, headers: corsHeaders(context)
    });
  }

  const calData = await calRes.json();
  const events = (calData.items || []).map(e => ({
    id: e.id,
    title: e.summary || '(No title)',
    start: e.start?.dateTime || e.start?.date || '',
    end: e.end?.dateTime || e.end?.date || '',
    allDay: !!e.start?.date,
    location: e.location || '',
    link: e.htmlLink || '',
    color: e.colorId || '',
  }));

  return new Response(JSON.stringify({ events }), {
    headers: corsHeaders(context)
  });
}

async function refreshAccessToken(tokens, context, kv) {
  if (!tokens.refresh_token) return null;

  const { clientId, clientSecret } = await getGoogleOAuthCredentials(context);
  if (!clientId || !clientSecret) return null;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const updated = {
    access_token: data.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
  };
  await kv.put('_google_tokens', JSON.stringify(updated));
  return updated;
}

function corsHeaders(context) {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  };
}
