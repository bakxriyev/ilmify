import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TelegramBotModel } from './entities/telegram-bot.entity';
import { TelegramChatModel } from './entities/telegram-chat.entity';
import { TelegramMessageModel } from './entities/telegram-message.entity';
import { TelegramTemplateModel } from './entities/telegram-template.entity';
import { TelegramBroadcastModel } from './entities/telegram-broadcast.entity';
import { StudentModel } from '../students/model/student.entity';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotController } from './telegram-bot.controller';
import { BotManagerService } from './bot-manager.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      TelegramBotModel,
      TelegramChatModel,
      TelegramMessageModel,
      TelegramTemplateModel,
      TelegramBroadcastModel,
      StudentModel,
    ]),
  ],
  controllers: [TelegramBotController],
  providers: [TelegramBotService, BotManagerService],
  exports: [TelegramBotService, BotManagerService],
})
export class TelegramBotModule {}
