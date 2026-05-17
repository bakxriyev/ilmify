import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { Request } from "express";

@Injectable()
export class ChatAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers["authorization"];

    if (!authHeader) {
      throw new UnauthorizedException("Token topilmadi");
    }

    const [type, token] = authHeader.split(" ");
    if (type !== "Bearer" || !token) {
      throw new UnauthorizedException("Notogri token format");
    }

    const secrets = [
      "secret123",
      process.env.JWT_SECRET || "secret123",
      process.env.JWT_ACCESS_SECRET || "kamron",
    ].filter(Boolean);

    for (const secret of secrets) {
      try {
        const payload = jwt.verify(token, secret) as any;

        (request as any).user = {
          id: payload.sub || payload.id,
          sub: payload.sub,
          type: payload.type || "student",
          jti: payload.jti,
          deviceId: payload.deviceId,
          phone_number: payload.phone_number,
        };
        return true;
      } catch {}
    }

    throw new UnauthorizedException("Token yaroqsiz");
  }
}
