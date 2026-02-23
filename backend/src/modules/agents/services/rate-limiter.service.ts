import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

export interface RateLimitInfo {
  current: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  windowSeconds: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly keyPrefix = 'ratelimit:agent:';

  constructor(private readonly redisService: RedisService) {}

  /**
   * Check and consume rate limit for an agent
   * Uses sliding window algorithm with Redis
   */
  async checkAndConsume(
    agentId: string,
    userId: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const key = this.getKey(agentId, userId);
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;

    try {
      const redis = this.redisService.getClient();

      // Use Redis pipeline for atomic operations
      const pipeline = redis.pipeline();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count current requests in window
      pipeline.zcard(key);

      // Add current request (will be committed only if under limit)
      pipeline.zadd(key, now, `${now}-${Math.random()}`);

      // Set expiry on the key
      pipeline.expire(key, config.windowSeconds);

      const results = await pipeline.exec();

      if (!results) {
        this.logger.error('Redis pipeline returned null');
        return this.allowRequest(config);
      }

      const currentCount = (results[1]?.[1] as number) || 0;

      if (currentCount >= config.maxRequests) {
        // Over limit - remove the request we just added
        await redis.zremrangebyscore(key, now, now);

        const oldestRequest = await redis.zrange(key, 0, 0, 'WITHSCORES');
        const resetAt = oldestRequest.length >= 2
          ? new Date(Number(oldestRequest[1]) + config.windowSeconds * 1000)
          : new Date(now + config.windowSeconds * 1000);

        const retryAfterSeconds = Math.ceil((resetAt.getTime() - now) / 1000);

        this.logger.warn(
          `Rate limit exceeded for agent ${agentId}, user ${userId}. ` +
          `Current: ${currentCount}, Limit: ${config.maxRequests}`,
        );

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfterSeconds: Math.max(1, retryAfterSeconds),
        };
      }

      const remaining = Math.max(0, config.maxRequests - currentCount - 1);
      const resetAt = new Date(now + config.windowSeconds * 1000);

      return {
        allowed: true,
        remaining,
        resetAt,
      };
    } catch (error) {
      this.logger.error(`Rate limit check error: ${error}`);
      // On error, allow the request (fail open)
      return this.allowRequest(config);
    }
  }

  /**
   * Get current rate limit status without consuming
   */
  async getStatus(
    agentId: string,
    userId: string,
    config: RateLimitConfig,
  ): Promise<RateLimitInfo> {
    const key = this.getKey(agentId, userId);
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;

    try {
      const redis = this.redisService.getClient();

      // Clean old entries and get count
      await redis.zremrangebyscore(key, 0, windowStart);
      const current = await redis.zcard(key);

      return {
        current,
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - current),
        resetAt: new Date(now + config.windowSeconds * 1000),
        windowSeconds: config.windowSeconds,
      };
    } catch (error) {
      this.logger.error(`Rate limit status error: ${error}`);
      return {
        current: 0,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: new Date(now + config.windowSeconds * 1000),
        windowSeconds: config.windowSeconds,
      };
    }
  }

  /**
   * Reset rate limit for an agent
   */
  async reset(agentId: string, userId: string): Promise<void> {
    const key = this.getKey(agentId, userId);
    try {
      await this.redisService.getClient().del(key);
      this.logger.log(`Rate limit reset for agent ${agentId}, user ${userId}`);
    } catch (error) {
      this.logger.error(`Rate limit reset error: ${error}`);
    }
  }

  /**
   * Check rate limit for a user (global, across all agents)
   */
  async checkUserGlobalLimit(
    userId: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const key = `${this.keyPrefix}user:${userId}:global`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      const redis = this.redisService.getClient();

      await redis.zremrangebyscore(key, 0, windowStart);
      const currentCount = await redis.zcard(key);

      if (currentCount >= maxRequests) {
        const oldestRequest = await redis.zrange(key, 0, 0, 'WITHSCORES');
        const resetAt = oldestRequest.length >= 2
          ? new Date(Number(oldestRequest[1]) + windowSeconds * 1000)
          : new Date(now + windowSeconds * 1000);

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfterSeconds: Math.ceil((resetAt.getTime() - now) / 1000),
        };
      }

      await redis.zadd(key, now, `${now}-${Math.random()}`);
      await redis.expire(key, windowSeconds);

      return {
        allowed: true,
        remaining: maxRequests - currentCount - 1,
        resetAt: new Date(now + windowSeconds * 1000),
      };
    } catch (error) {
      this.logger.error(`User global rate limit error: ${error}`);
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: new Date(now + windowSeconds * 1000),
      };
    }
  }

  private getKey(agentId: string, userId: string): string {
    return `${this.keyPrefix}${userId}:${agentId}`;
  }

  private allowRequest(config: RateLimitConfig): RateLimitResult {
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(Date.now() + config.windowSeconds * 1000),
    };
  }
}
