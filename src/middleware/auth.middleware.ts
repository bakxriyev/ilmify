import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserDeviceModel } from '../modules/user_device/entities/user_device.entity';

// O'zingizning payload interfeysingiz
interface AuthPayload {
  sub: number;
  type: 'student' | 'teacher';
  jti: string;
  deviceId: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        type: 'student' | 'teacher';
      };
      center_id?: number;
    }
  }}

export async function deviceAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided error' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // type guard funksiyasi
    if (!isValidAuthPayload(decoded)) {
      throw new Error('Invalid token payload structure');
    }

    const payload: AuthPayload = decoded;

    const session = await UserDeviceModel.findOne({
      where: {
        user_type: payload.type,
        user_id: payload.sub,
        jti: payload.jti,
        device_id: payload.deviceId,
        is_active: true,
      },
    });

    if (!session) {
      return res.status(401).json({
        message: 'Session expired or logged in from another device. Please login again.',
      });
    }

    session.last_active = new Date();
    await session.save();

    // req ga qo‘shish
    req.user = { id: payload.sub, type: payload.type };

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Type guard
function isValidAuthPayload(obj: any): obj is AuthPayload {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.sub === 'number' &&
    ['student', 'teacher'].includes(obj.type) &&
    typeof obj.jti === 'string' &&
    typeof obj.deviceId === 'string'
  );
}