import { getAuthUser } from '../lib/auth.js';
import { getStartPageKv } from '../lib/kv.js';

/**
 * POST /api/links/add — Add a link to a group.
 * Body: { groupId, name, url, useFavicon }
 * Requires authentication.
 */
export async function onRequestPost(context) {
  const user = await getAuthUser(context);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }

  const kv = getStartPageKv(context.env);
  if (!kv) {
    return new Response(JSON.stringify({ error: 'KV not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { groupId, name, url, useFavicon } = await context.request.json();

  if (!name || !url) {
    return new Response(JSON.stringify({ error: 'Name and URL are required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Load current data
  const data = await kv.get('appData', { type: 'json' });
  if (!data || !data.groups) {
    return new Response(JSON.stringify({ error: 'No data found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Find the group
  const group = groupId
    ? data.groups.find(g => g.id === groupId)
    : data.groups[0]; // Default to first group

  if (!group) {
    return new Response(JSON.stringify({ error: 'Group not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Add the link
  if (!group.links) group.links = [];
  group.links.push({
    id: 'l' + Math.random().toString(36).substr(2, 9),
    name,
    url,
    useFavicon: useFavicon !== false
  });

  await kv.put('appData', JSON.stringify(data));

  return new Response(JSON.stringify({ success: true, groupId: group.id, groupTitle: group.title }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * GET /api/links/groups — List groups (id + title) for the extension picker.
 * Requires authentication.
 */
export async function onRequestGet(context) {
  const user = await getAuthUser(context);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }

  const kv = getStartPageKv(context.env);
  if (!kv) {
    return new Response(JSON.stringify({ error: 'KV not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json' }
    });
  }

  const data = await kv.get('appData', { type: 'json' });
  if (!data || !data.groups) {
    return new Response(JSON.stringify({ groups: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const groups = data.groups.map(g => ({ id: g.id, title: g.title }));
  return new Response(JSON.stringify({ groups }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
