// auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthService } from './auth.service';
import { StudentModel } from '../students/model/student.entity';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { MailModule } from 'src/services/mail.module';
import { RedisModule } from 'src/services/redis.module';
import { AuthController } from './auth.controller';
import { TeacherModel } from '../teachers';
import { UserDeviceModel } from '../user_device/entities/user_device.entity';

// auth.module.ts
@Module({
  imports: [
    SequelizeModule.forFeature([StudentModel,UserDeviceModel]),MailModule,RedisModule,
    JwtModule.register({
      secret:  'secret123',
      signOptions: { expiresIn: '1d' }
    }),
  ],
  providers: [AuthService, JwtAuthGuard],
  controllers:[AuthController],
  exports: [JwtModule]
})
export class AuthModule {}

