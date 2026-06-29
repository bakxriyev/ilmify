import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  private redis: Redis | null = null;
  private connected = false;
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    this.tryConnect();
  }

  private tryConnect() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        retryStrategy: () => null,
        lazyConnect: true,
      });
      this.redis.on('error', (err) => {
        this.connected = false;
        this.logger.warn(`Redis ulanish xatosi: ${err.message}`);
      });
      this.redis.on('connect', () => {
        this.connected = true;
        this.logger.log('Redis ulandi');
      });
    } catch (err) {
      this.logger.warn('Redis sozlanmagan, kesh ishlamaydi');
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.redis || !this.connected) return;
    try {
      if (ttl) {
        await this.redis.setex(key, ttl, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch { }
  }

  async get(key: string): Promise<string | null> {
    if (!this.redis || !this.connected) return null;
    try {
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redis || !this.connected) return;
    try {
      await this.redis.del(key);
    } catch { }
  }
}