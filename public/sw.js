const CACHE_NAME = 'commentgenius-v1.9.0';
const STATIC_CACHE = 'static-v1.9';
const DYNAMIC_CACHE = 'dynamic-v1.9';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

const API_PATTERNS = /^\/api\//;
const EXCLUDED_PATHS = ['/api/auth', '/api/ocr'];

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event: FetchEvent & { request: Request }) => {
  const { request } = event;
  const url = new URL(request.url);

  if (EXCLUDED_PATHS.some(path => url.pathname.startsWith(path))) {
    return;
  }

  if (API_PATTERNS.test(url.pathname)) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
  }
});

async function handleApiRequest(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      const clonedResponse = networkResponse.clone();

      try {
        await cache.put(request, clonedResponse);
      } catch (cacheError) {
        console.warn('Cache put failed:', cacheError);
      }
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Cache', 'stale');

      return new Response(cachedResponse.body, {
        status: 200,
        statusText: 'OK (from cache)',
        headers,
      });
    }

    return new Response(
      JSON.stringify({ error: '网络不可用，请检查连接后重试' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleStaticRequest(request: Request): Promise<Response> {
  const cachedResponse = await caches.match(request);

  if (cachedResponse && navigator.onLine === false) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);

      try {
        await cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        console.warn('Static cache put failed:', cacheError);
      }
    }

    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }

    if (request.destination === 'document') {
      return caches.match('/') || new Response('离线页面', { status: 503 });
    }

    return new Response('', { status: 404 });
  }
}

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(names.map((name) => caches.delete(name)))
      )
    );
  }
});
