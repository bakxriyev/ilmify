import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AutoNotificationController } from './auto-notification.controller';
import { AutoNotificationService } from './auto-notification.service';
import { AutoNotificationConfigModel } from './entities/auto-notification-config.entity';
import { AutoNotificationLogModel } from './entities/auto-notification-log.entity';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { NotificationModule } from '../notification/notification.module';
import { StudentModel } from '../students/model/student.entity';
import { TelegramChatModel } from '../telegram-bot/entities/telegram-chat.entity';
import { PaymentModel } from '../payments/entities/payment.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([
      AutoNotificationConfigModel,
      AutoNotificationLogModel,
      StudentModel,
      TelegramChatModel,
      PaymentModel,
    ]),
    TelegramBotModule,
    NotificationModule,
  ],
  controllers: [AutoNotificationController],
  providers: [AutoNotificationService],
  exports: [AutoNotificationService],
})
export class AutoNotificationModule {}
