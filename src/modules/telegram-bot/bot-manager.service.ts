import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TelegramBotModel } from './entities/telegram-bot.entity';
import { TelegramMessageModel } from './entities/telegram-message.entity';

@Injectable()
export class BotManagerService {
  private readonly logger = new Logger(BotManagerService.name);
  private botTokens: Map<number, string> = new Map();

  constructor(
    @InjectModel(TelegramBotModel)
    private botModel: typeof TelegramBotModel,
    @InjectModel(TelegramMessageModel)
    private messageModel: typeof TelegramMessageModel,
  ) {
    this.loadTokens();
  }

  private async loadTokens() {
    const bots = await this.botModel.findAll({ where: { is_active: true } });
    for (const bot of bots) {
      this.botTokens.set(bot.center_id, bot.bot_token);
    }
    if (bots.length > 0) {
      this.logger.log(`Loaded ${bots.length} bot tokens for sending`);
    }
  }

  async startBot(centerId: number, token: string): Promise<void> {
    this.botTokens.set(centerId, token);
    this.logger.log(`Bot token saved for center ${centerId}`);
  }

  async stopBot(centerId: number): Promise<void> {
    this.botTokens.delete(centerId);
    this.logger.log(`Bot stopped for center ${centerId}`);
  }

  async isRunning(centerId: number): Promise<boolean> {
    return this.botTokens.has(centerId);
  }

  async sendToChat(centerId: number, chatId: number, text: string): Promise<boolean> {
    try {
      await this.callTelegramApi(centerId, 'sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      });
      await this.messageModel.create({
        center_id: centerId,
        chat_id: chatId,
        from_bot: true,
        text,
      });
      return true;
    } catch (err: any) {
      this.logger.error(`Send error to ${chatId} for center ${centerId}: ${err.message}`);
      return false;
    }
  }

  async callTelegramApi(centerId: number, method: string, params: any): Promise<any> {
    const token = this.botTokens.get(centerId);
    if (!token) {
      const bot = await this.botModel.findOne({ where: { center_id: centerId, is_active: true } });
      if (!bot) throw new Error(`Bot not configured for center ${centerId}`);
      this.botTokens.set(centerId, bot.bot_token);
    }
    const t = this.botTokens.get(centerId)!;
    const url = `https://api.telegram.org/bot${t}/${method}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Telegram API error: ${data.description || res.statusText}`);
    return data;
  }
}
