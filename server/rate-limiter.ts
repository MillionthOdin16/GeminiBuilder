/**
 * Rate Limiter - Request throttling middleware
 * 
 * Implements token bucket algorithm for rate limiting
 */

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  message?: string;      // Error message
  keyGenerator?: (req: any) => string;  // Key generator function
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  onLimitReached?: (req: any, res: any) => void;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      windowMs: config.windowMs || 60000, // 1 minute default
      maxRequests: config.maxRequests || 100,
      message: config.message || 'Too many requests, please try again later',
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      skipFailedRequests: config.skipFailedRequests || false,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      onLimitReached: config.onLimitReached,
    };

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Default key generator - uses IP address
   */
  private defaultKeyGenerator(req: any): string {
    return req.ip || 
           req.headers['x-forwarded-for']?.split(',')[0] || 
           req.connection?.remoteAddress ||
           'unknown';
  }

  /**
   * Get or create token bucket for a key
   */
  private getBucket(key: string): TokenBucket {
    let bucket = this.buckets.get(key);
    const now = Date.now();

    if (!bucket) {
      bucket = {
        tokens: this.config.maxRequests,
        lastRefill: now,
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill;
    const refillAmount = (timePassed / this.config.windowMs) * this.config.maxRequests;
    
    bucket.tokens = Math.min(
      this.config.maxRequests,
      bucket.tokens + refillAmount
    );
    bucket.lastRefill = now;

    return bucket;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const bucket = this.getBucket(key);
    const allowed = bucket.tokens >= 1;

    if (allowed) {
      bucket.tokens -= 1;
    }

    const resetTime = Math.ceil(
      (this.config.windowMs - (Date.now() - bucket.lastRefill)) / 1000
    );

    return {
      allowed,
      remaining: Math.floor(bucket.tokens),
      resetTime: Math.max(0, resetTime),
    };
  }

  /**
   * Express middleware
   */
  middleware() {
    return (req: any, res: any, next: any) => {
      const key = this.config.keyGenerator!(req);
      const { allowed, remaining, resetTime } = this.isAllowed(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);

      if (!allowed) {
        res.setHeader('Retry-After', resetTime);
        
        if (this.config.onLimitReached) {
          this.config.onLimitReached(req, res);
        }

        return res.status(429).json({
          error: 'Too Many Requests',
          message: this.config.message,
          retryAfter: resetTime,
        });
      }

      // Track response status for skip options
      if (this.config.skipFailedRequests || this.config.skipSuccessfulRequests) {
        const originalEnd = res.end;
        res.end = (...args: any[]) => {
          if (
            (this.config.skipFailedRequests && res.statusCode >= 400) ||
            (this.config.skipSuccessfulRequests && res.statusCode < 400)
          ) {
            // Refund the token
            const bucket = this.buckets.get(key);
            if (bucket) {
              bucket.tokens = Math.min(this.config.maxRequests, bucket.tokens + 1);
            }
          }
          return originalEnd.apply(res, args);
        };
      }

      next();
    };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.buckets.clear();
  }

  /**
   * Start cleanup of old buckets
   */
  private startCleanup(): void {
    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Cleanup old buckets
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = this.config.windowMs * 2;

    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Stop cleanup interval
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get current stats
   */
  getStats(): {
    totalBuckets: number;
    averageTokens: number;
  } {
    let totalTokens = 0;
    
    for (const bucket of this.buckets.values()) {
      totalTokens += bucket.tokens;
    }

    return {
      totalBuckets: this.buckets.size,
      averageTokens: this.buckets.size > 0 ? totalTokens / this.buckets.size : 0,
    };
  }
}

// Preset rate limiters
export const rateLimiters = {
  // General API rate limit - 100 requests per minute
  general: new RateLimiter({
    windowMs: 60000,
    maxRequests: 100,
  }),

  // Authentication rate limit - 10 attempts per minute
  auth: new RateLimiter({
    windowMs: 60000,
    maxRequests: 10,
    message: 'Too many login attempts, please try again later',
  }),

  // CLI commands - 30 per minute
  cli: new RateLimiter({
    windowMs: 60000,
    maxRequests: 30,
  }),

  // File operations - 60 per minute
  files: new RateLimiter({
    windowMs: 60000,
    maxRequests: 60,
  }),

  // Settings changes - 20 per minute
  settings: new RateLimiter({
    windowMs: 60000,
    maxRequests: 20,
  }),
};

/**
 * Create a custom rate limiter
 */
export function createRateLimiter(config: Partial<RateLimitConfig>): RateLimiter {
  return new RateLimiter(config);
}

/**
 * Sliding window rate limiter for more accurate limiting
 */
export class SlidingWindowRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get or create request timestamps
    let timestamps = this.requests.get(key) || [];

    // Filter out old timestamps
    timestamps = timestamps.filter(t => t > windowStart);

    // Check if allowed
    if (timestamps.length >= this.maxRequests) {
      this.requests.set(key, timestamps);
      return false;
    }

    // Add new timestamp
    timestamps.push(now);
    this.requests.set(key, timestamps);

    return true;
  }

  getRemaining(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = this.requests.get(key) || [];
    const recentCount = timestamps.filter(t => t > windowStart).length;
    return Math.max(0, this.maxRequests - recentCount);
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  resetAll(): void {
    this.requests.clear();
  }
}

/**
 * Per-endpoint rate limiting middleware factory
 */
export function createEndpointRateLimiter(
  endpoints: Record<string, { windowMs: number; maxRequests: number }>
): (req: any, res: any, next: any) => void {
  const limiters = new Map<string, RateLimiter>();

  for (const [pattern, config] of Object.entries(endpoints)) {
    limiters.set(pattern, new RateLimiter(config));
  }

  return (req: any, res: any, next: any) => {
    const path = req.path;
    
    for (const [pattern, limiter] of limiters) {
      if (path.startsWith(pattern) || new RegExp(pattern).test(path)) {
        return limiter.middleware()(req, res, next);
      }
    }

    // No matching pattern, allow request
    next();
  };
}
