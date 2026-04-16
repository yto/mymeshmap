// GET  /api/sync?user_id=xxx  → 訪問済みメッシュコード一覧を返す
// POST /api/sync              → { user_id, meshes: [...] } を保存

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
    'SELECT mesh_code FROM visits WHERE user_id = ?'
  ).bind(userId).all();

  return Response.json(
    { meshes: results.map(r => r.mesh_code) },
    { headers: CORS }
  );
}

export async function onRequestPost({ request, env }) {
  const { user_id, meshes } = await request.json();
  if (!user_id || !Array.isArray(meshes)) {
    return Response.json({ error: 'user_id and meshes required' }, { status: 400, headers: CORS });
  }

  // 全削除 → 再挿入（差分管理よりシンプルで確実）
  await env.DB.prepare('DELETE FROM visits WHERE user_id = ?').bind(user_id).run();

  if (meshes.length > 0) {
    // D1 はバインドパラメータ上限が 100 のため、batch() で1行ずつ挿入する
    const stmts = meshes.map(code =>
      env.DB.prepare('INSERT INTO visits (user_id, mesh_code) VALUES (?, ?)').bind(user_id, code)
    );
    await env.DB.batch(stmts);
  }

  return Response.json(
    { ok: true, count: meshes.length },
    { headers: CORS }
  );
}
