const CACHE = 'mymeshmap-v1';

// CDNリソースはURLにバージョンが入っているため変更なし → キャッシュ優先
const CDN_PREFETCH = [
  'https://unpkg.com/maplibre-gl@5.3.0/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@5.3.0/dist/maplibre-gl.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
];

self.addEventListener('install', e => {
  // CDNリソースだけ事前キャッシュ（HTMLはネットワーク優先のためここではキャッシュしない）
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CDN_PREFETCH))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API・地図タイルはキャッシュしない（常にネットワーク）
  if (url.pathname.startsWith('/api/') ||
      url.hostname === 'cyberjapandata.gsi.go.jp') {
    return;
  }

  // CDNリソース（外部ホスト）: キャッシュ優先 → なければネットワーク取得してキャッシュ
  if (url.hostname !== self.location.hostname) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // 自サイトのリソース（HTML・SVG等）: ネットワーク優先
  // → 最新コードを常に取得し、オフライン時のみキャッシュにフォールバック
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
