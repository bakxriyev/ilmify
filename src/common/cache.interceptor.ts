import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../services/cache.service';
import { Reflector } from '@nestjs/core';
import { CACHE_TTL } from './cache-decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private cacheService: CacheService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl } = request;

    if (method !== 'GET') return next.handle();

    const ttl = this.reflector.get<number>(CACHE_TTL, context.getHandler()) || 30;
    if (ttl <= 0) return next.handle();

    const centerId = request.center_id || 'global';
    const cacheKey = `cache:${centerId}:${originalUrl}`;

    const cached = this.cacheService.get(cacheKey);
    if (cached !== null) {
      return of(cached);
    }

    return next.handle().pipe(
      tap((response) => {
        this.cacheService.set(cacheKey, response, ttl);
      }),
    );
  }
}
