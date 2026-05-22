import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AutoNotificationController } from './auto-notification.controller';
import { AutoNotificationService } from './auto-notification.service';
import { AutoNotificationConfigModel } from './entities/auto-notification-config.entity';
import { AutoNotificationLogModel } from './entities/auto-notification-log.entity';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { NotificationModule } from '../notification/notification.module';
import { PaymentModule } from '../payments/payment.module';
import { StudentModel } from '../students/model/student.entity';
import { TelegramChatModel } from '../telegram-bot/entities/telegram-chat.entity';
import { GroupModel } from '../groups/model/group.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([
      AutoNotificationConfigModel,
      AutoNotificationLogModel,
      StudentModel,
      GroupModel,
      TelegramChatModel,
    ]),
    TelegramBotModule,
    NotificationModule,
    PaymentModule,
  ],
  controllers: [AutoNotificationController],
  providers: [AutoNotificationService],
  exports: [AutoNotificationService],
})
export class AutoNotificationModule {}