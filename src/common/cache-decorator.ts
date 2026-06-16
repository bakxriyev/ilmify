import { SetMetadata } from '@nestjs/common';

export const CACHE_TTL = 'cache_ttl';
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL, ttl);
