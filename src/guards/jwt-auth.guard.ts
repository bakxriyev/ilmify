import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Token topilmadi');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Noto\'g\'ri token format');
    }

    const secrets = [
      'secret123',
      process.env.JWT_SECRET || 'secret123',
      process.env.JWT_ACCESS_SECRET || 'kamron',
    ].filter(Boolean);

    for (const secret of secrets) {
      try {
        const payload = jwt.verify(token, secret) as any;
        request['user'] = payload;
        return true;
      } catch {}
    }

    throw new UnauthorizedException('Noto\'g\'ri token');
  }
}
