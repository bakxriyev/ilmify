import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TelegramSettingsModel } from './entities/telegram-settings.entity';
import { TelegramService } from './telegram.service';
import { TelegramController, TelegramAuthController } from './telegram.controller';
import { StudentModel } from '../students/model/student.entity';
import { PaymentModel } from '../payments/entities/payment.entity';
import { AttendanceModel } from '../attendence/model/attendence.entity';
import { ParentStudentModel } from '../parents/entities/parent-student.entity';
import { ParentModel } from '../parents/entities/parent.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([
      TelegramSettingsModel,
      StudentModel,
      PaymentModel,
      AttendanceModel,
      ParentStudentModel,
      ParentModel,
    ]),
  ],
  controllers: [TelegramController, TelegramAuthController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
