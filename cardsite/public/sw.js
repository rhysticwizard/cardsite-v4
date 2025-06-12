// 🚀 PHASE 3B: Service Worker for Persistent MTG Data Caching
// This service worker provides offline-first caching for MTG sets data

const CACHE_NAME = 'mtg-cardsite-v1';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Cache strategy: Cache First for API data, Network First for pages
const CACHE_STRATEGIES = {
  API_DATA: 'cache-first',
  PAGES: 'network-first',
  STATIC: 'cache-first'
};

// URLs to cache
const URLS_TO_CACHE = [
  '/',
  '/cards',
  '/manifest.json'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching essential resources');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle GET requests
  if (request.method !== 'GET') return;
  
  // Handle Scryfall API requests with cache-first strategy
  if (url.hostname === 'api.scryfall.com') {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle same-origin requests
  if (url.origin === self.location.origin) {
    // Static assets - cache first
    if (url.pathname.startsWith('/_next/static/')) {
      event.respondWith(handleStaticRequest(request));
      return;
    }
    
    // Pages - network first with cache fallback
    event.respondWith(handlePageRequest(request));
  }
});

// Cache-first strategy for API data (with expiry check)
async function handleApiRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Check if cached response exists and is still fresh
  if (cachedResponse) {
    const cachedDate = cachedResponse.headers.get('sw-cached-date');
    if (cachedDate) {
      const age = Date.now() - parseInt(cachedDate);
      if (age < CACHE_EXPIRY) {
        console.log('📋 Serving MTG data from cache (age: ' + Math.round(age/1000/60) + ' minutes)');
        return cachedResponse;
      }
    }
  }
  
  try {
    console.log('🌐 Fetching fresh MTG data from Scryfall API');
    const response = await fetch(request);
    
    if (response.ok) {
      // Clone response and add cache date header
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-date', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      // Cache for future use
      cache.put(request, modifiedResponse.clone());
      console.log('✅ Cached fresh MTG data');
      
      return modifiedResponse;
    }
    
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.log('❌ Network failed, falling back to cache');
    
    // Return cached version even if expired
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page or error response
    return new Response(
      JSON.stringify({ 
        error: 'Offline - MTG data unavailable',
        message: 'Please check your internet connection'
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache-first strategy for static assets
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy for pages
async function handlePageRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline', { 
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0].postMessage(stats);
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearExpiredCache().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Get cache statistics
async function getCacheStats() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  let totalSize = 0;
  let apiEntries = 0;
  let pageEntries = 0;
  let staticEntries = 0;
  
  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const url = new URL(request.url);
      
      if (url.hostname === 'api.scryfall.com') {
        apiEntries++;
      } else if (url.pathname.startsWith('/_next/static/')) {
        staticEntries++;
      } else {
        pageEntries++;
      }
    }
  }
  
  return {
    totalEntries: keys.length,
    apiEntries,
    pageEntries,
    staticEntries,
    cacheName: CACHE_NAME
  };
}

// Clear expired cache entries
async function clearExpiredCache() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const cachedDate = response.headers.get('sw-cached-date');
      if (cachedDate) {
        const age = Date.now() - parseInt(cachedDate);
        if (age > CACHE_EXPIRY) {
          await cache.delete(request);
          console.log('🗑️ Removed expired cache entry:', request.url);
        }
      }
    }
  }
} 