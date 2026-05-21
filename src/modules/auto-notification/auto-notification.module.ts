import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AutoNotificationController } from './auto-notification.controller';
import { AutoNotificationService } from './auto-notification.service';
import { AutoNotificationConfigModel } from './entities/auto-notification-config.entity';
import { AutoNotificationLogModel } from './entities/auto-notification-log.entity';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { StudentModel } from '../students/model/student.entity';
import { TelegramChatModel } from '../telegram-bot/entities/telegram-chat.entity';
import { PaymentModel } from '../payments/entities/payment.entity';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([
      AutoNotificationConfigModel,
      AutoNotificationLogModel,
      StudentModel,
      TelegramChatModel,
      PaymentModel,
      EducationCenterModel,
    ]),
    TelegramBotModule,
  ],
  controllers: [AutoNotificationController],
  providers: [AutoNotificationService],
  exports: [AutoNotificationService],
})
export class AutoNotificationModule {}
