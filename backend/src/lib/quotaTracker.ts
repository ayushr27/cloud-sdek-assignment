import { getBullMQRedis } from '../queues/generationQueue';

export type ModelName = 'gemini-2.5-flash-lite' | 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'groq-llama-3.3-70b';

export interface QuotaStatus {
  model: ModelName;
  used: number;
  limit: number;
  isCooldown: boolean;
  cooldownRemaining?: number;
}

const DAILY_LIMITS: Record<ModelName, number> = {
  'gemini-2.5-flash-lite': 1000,
  'gemini-2.5-flash': 500,
  'gemini-2.5-pro': 100,
  'groq-llama-3.3-70b': 14400,
};

// Helper: wrap a Redis call with a timeout to prevent hanging
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => {
      console.warn(`⚠️  QuotaTracker Redis operation timed out after ${ms}ms`);
      resolve(fallback);
    }, ms)),
  ]);
}

const REDIS_TIMEOUT_MS = 3000;

export class QuotaTracker {
  private getTodayStr(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  async canUse(model: ModelName): Promise<boolean> {
    const redisClient = getBullMQRedis();
    // If Redis is unavailable, fail open — allow all models to proceed
    if (!redisClient) return true;

    try {
      const cooldownKey = `cooldown:${model}`;
      const isCooldown = await withTimeout(redisClient.exists(cooldownKey), REDIS_TIMEOUT_MS, 0);
      if (isCooldown) return false;

      const today = this.getTodayStr();
      const quotaKey = `quota:${model}:${today}`;
      const usedStr = await withTimeout(redisClient.get(quotaKey), REDIS_TIMEOUT_MS, null);
      const used = usedStr ? parseInt(usedStr, 10) : 0;

      return used < DAILY_LIMITS[model];
    } catch {
      // Redis error — fail open and allow the model
      return true;
    }
  }

  async increment(model: ModelName): Promise<void> {
    const redisClient = getBullMQRedis();
    if (!redisClient) return; // no-op, Redis unavailable

    try {
      const today = this.getTodayStr();
      const quotaKey = `quota:${model}:${today}`;
      
      const multi = redisClient.multi();
      multi.incr(quotaKey);
      multi.ttl(quotaKey);
      const results = await withTimeout(multi.exec(), REDIS_TIMEOUT_MS, null);
      
      if (results && results[1] && results[1][1] === -1) {
        await withTimeout(redisClient.expire(quotaKey, 86400), REDIS_TIMEOUT_MS, 0);
      }
    } catch {
      // Redis error — silently skip quota tracking
    }
  }

  async setCooldown(model: ModelName, ttlSeconds: number): Promise<void> {
    const redisClient = getBullMQRedis();
    if (!redisClient) return; // no-op, Redis unavailable

    try {
      const cooldownKey = `cooldown:${model}`;
      await withTimeout(redisClient.set(cooldownKey, '1', 'EX', ttlSeconds), REDIS_TIMEOUT_MS, null);
    } catch {
      // Redis error — silently skip cooldown setting
    }
  }

  async getStatus(): Promise<QuotaStatus[]> {
    const redisClient = getBullMQRedis();
    if (!redisClient) return [];

    try {
      const today = this.getTodayStr();
      const statuses: QuotaStatus[] = [];
      
      for (const model of Object.keys(DAILY_LIMITS) as ModelName[]) {
        const quotaKey = `quota:${model}:${today}`;
        const cooldownKey = `cooldown:${model}`;
        
        const usedStr = await withTimeout(redisClient.get(quotaKey), REDIS_TIMEOUT_MS, null);
        const used = usedStr ? parseInt(usedStr, 10) : 0;
        const ttl = await withTimeout(redisClient.ttl(cooldownKey), REDIS_TIMEOUT_MS, -1);
        
        statuses.push({
          model,
          used,
          limit: DAILY_LIMITS[model],
          isCooldown: ttl > 0,
          cooldownRemaining: ttl > 0 ? ttl : undefined
        });
      }
      return statuses;
    } catch {
      return [];
    }
  }
}

export const quotaTracker = new QuotaTracker();
