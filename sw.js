const CACHE = 'mymeshmap-v1';

// アプリシェル：起動に必要なファイルだけキャッシュ
const APP_SHELL = [
  '/',
  '/favicon.svg',
  '/manifest.json',
  'https://unpkg.com/maplibre-gl@5.3.0/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@5.3.0/dist/maplibre-gl.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // 古いキャッシュを削除
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

  // アプリシェル：キャッシュ優先、なければネットワーク
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
