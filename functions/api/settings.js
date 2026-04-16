// GET  /api/settings?user_id=xxx       → 全設定を返す
// POST /api/settings                   → { user_id, key, value } を保存

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  if (!userId) {
    return Response.json({ error: 'user_id required' }, { status: 400, headers: CORS });
  }

  const { results } = await env.DB.prepare(
    'SELECT key, value FROM settings WHERE user_id = ?'
  ).bind(userId).all();

  const settings = Object.fromEntries(
    results.map(r => [r.key, JSON.parse(r.value)])
  );
  return Response.json({ settings }, { headers: CORS });
}

export async function onRequestPost({ request, env }) {
  const { user_id, key, value } = await request.json();
  if (!user_id || !key) {
    return Response.json({ error: 'user_id and key required' }, { status: 400, headers: CORS });
  }

  await env.DB.prepare(`
    INSERT INTO settings (user_id, key, value, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, key)
    DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).bind(user_id, key, JSON.stringify(value)).run();

  return Response.json({ ok: true }, { headers: CORS });
}
