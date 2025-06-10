// Shared rate limit store for consistent rate limiting across frontend and backend
export interface RateLimitInfo {
  isRateLimited: boolean;
  retryAfter: number;
  remaining: number;
}

let globalRateLimitStore: Map<string, { count: number; resetTime: number }> | null = null;

export function getGlobalRateLimitStore() {
  if (!globalRateLimitStore) {
    globalRateLimitStore = new Map();
  }
  return globalRateLimitStore;
}

export function checkGlobalRateLimit(
  identifier: string, 
  maxRequests: number, 
  windowMs: number
): RateLimitInfo {
  const store = getGlobalRateLimitStore();
  const now = Date.now();
  
  // Clean up expired entries
  for (const [key, value] of store.entries()) {
    if (now > value.resetTime) {
      store.delete(key);
    }
  }
  
  let data = store.get(identifier);
  
  if (!data || now > data.resetTime) {
    // Create new entry
    data = {
      count: 0,
      resetTime: now + windowMs
    };
  }
  
  data.count++;
  store.set(identifier, data);
  
  const isRateLimited = data.count > maxRequests;
  const remaining = Math.max(0, maxRequests - data.count);
  const retryAfter = isRateLimited ? Math.ceil((data.resetTime - now) / 1000) : 0;
  
  console.log(`🔍 Global rate limit check: ${identifier} - ${data.count}/${maxRequests} (limited: ${isRateLimited})`);
  
  return {
    isRateLimited,
    remaining,
    retryAfter
  };
} 