// POST /api/reissue  → { old_user_id, new_user_id }
// データを旧IDから新IDへコピーし、旧IDのデータを削除する

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  const { old_user_id, new_user_id } = await request.json();
  if (!old_user_id || !new_user_id) {
    return Response.json({ error: 'old_user_id and new_user_id required' }, { status: 400, headers: CORS });
  }
  if (old_user_id === new_user_id) {
    return Response.json({ error: 'IDs must differ' }, { status: 400, headers: CORS });
  }

  await env.DB.batch([
    // visits: 旧ID → 新ID へコピー
    env.DB.prepare(`
      INSERT OR IGNORE INTO visits (user_id, mesh_code, created_at)
      SELECT ?, mesh_code, created_at FROM visits WHERE user_id = ?
    `).bind(new_user_id, old_user_id),

    // settings: 旧ID → 新ID へコピー
    env.DB.prepare(`
      INSERT OR IGNORE INTO settings (user_id, key, value, updated_at)
      SELECT ?, key, value, updated_at FROM settings WHERE user_id = ?
    `).bind(new_user_id, old_user_id),

    // 旧IDのデータを削除
    env.DB.prepare('DELETE FROM visits WHERE user_id = ?').bind(old_user_id),
    env.DB.prepare('DELETE FROM settings WHERE user_id = ?').bind(old_user_id),
  ]);

  return Response.json({ ok: true }, { headers: CORS });
}
