import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';
import { UserDeviceModel } from '../modules/user_device/entities/user_device.entity';

@Injectable()
export class StudentAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @InjectModel(UserDeviceModel)
    private userDeviceModel: typeof UserDeviceModel,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token topilmadi');
    }

    try {
      // Token'ni verify qilish
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });

      // Token type'ni tekshirish
      if (payload.type !== 'student') {
        throw new UnauthorizedException('Noto\'g\'ri token turi');
      }

      // Session'ni tekshirish
      const session = await this.userDeviceModel.findOne({
        where: {
          user_type: 'student',
          user_id: payload.sub,
          jti: payload.jti,
          device_id: payload.deviceId,
          is_active: true,
        },
      });

      if (!session) {
        throw new UnauthorizedException('Session bekor qilingan');
      }

      // Session last_active yangilash
      session.last_active = new Date();
      await session.save();

      // Request'ga user ma'lumotlarini qo'shish
      request.user = {
        id: payload.sub,
        type: payload.type,
        jti: payload.jti,
        deviceId: payload.deviceId,
        phone_number: payload.phone_number,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Token yaroqsiz yoki muddati o\'tgan');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}