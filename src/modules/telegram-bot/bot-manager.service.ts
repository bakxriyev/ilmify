import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TelegramBotModel } from './entities/telegram-bot.entity';
import { TelegramChatModel } from './entities/telegram-chat.entity';
import { TelegramMessageModel } from './entities/telegram-message.entity';

interface BotInstance {
  centerId: number;
  token: string;
  polling: boolean;
  lastOffset: number;
}

@Injectable()
export class BotManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotManagerService.name);
  private bots: Map<number, BotInstance> = new Map();
  private pollingTimers: Map<number, NodeJS.Timeout> = new Map();

  constructor(
    @InjectModel(TelegramBotModel)
    private botModel: typeof TelegramBotModel,
    @InjectModel(TelegramChatModel)
    private chatModel: typeof TelegramChatModel,
    @InjectModel(TelegramMessageModel)
    private messageModel: typeof TelegramMessageModel,
  ) {}

  async onModuleInit() {
    await this.startAllActiveBots();
  }

  async startAllActiveBots() {
    const activeBots = await this.botModel.findAll({ where: { is_active: true } });
    for (const bot of activeBots) {
      this.startBot(bot.center_id, bot.bot_token).catch(err => {
        this.logger.error(`Failed to start bot for center ${bot.center_id}: ${err.message}`);
      });
    }
    this.logger.log(`Started ${activeBots.length} active bots`);
  }

  async startBot(centerId: number, token: string): Promise<void> {
    await this.stopBot(centerId);
    const instance: BotInstance = { centerId, token, polling: true, lastOffset: 0 };
    this.bots.set(centerId, instance);
    this.startPolling(centerId);
    this.logger.log(`Bot started for center ${centerId}`);
  }

  async stopBot(centerId: number): Promise<void> {
    const timer = this.pollingTimers.get(centerId);
    if (timer) clearTimeout(timer);
    this.pollingTimers.delete(centerId);
    this.bots.delete(centerId);
    this.logger.log(`Bot stopped for center ${centerId}`);
  }

  async isRunning(centerId: number): Promise<boolean> {
    return this.bots.has(centerId);
  }

  private startPolling(centerId: number) {
    const instance = this.bots.get(centerId);
    if (!instance || !instance.polling) return;

    const poll = async () => {
      try {
        const url = `https://api.telegram.org/bot${instance.token}/getUpdates`;
        const params = new URLSearchParams({
          offset: String(instance.lastOffset),
          timeout: '30',
          allowed_updates: 'message',
        });
        const res = await fetch(`${url}?${params}`, { signal: AbortSignal.timeout(35000) });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            this.logger.warn(`Invalid token for center ${centerId}, stopping bot`);
            await this.stopBot(centerId);
            await this.botModel.update({ is_active: false }, { where: { center_id: centerId } });
            return;
          }
          throw new Error(`HTTP ${res.status}: ${data.description || 'Unknown'}`);
        }
        const updates = data.result || [];
        for (const update of updates) {
          instance.lastOffset = update.update_id + 1;
          await this.handleUpdate(centerId, instance.token, update);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // timeout is normal
        } else {
          this.logger.error(`Poll error for center ${centerId}: ${err.message}`);
        }
      }

      if (this.bots.has(centerId)) {
        const timer = setTimeout(poll, 1000);
        this.pollingTimers.set(centerId, timer);
      }
    };

    poll();
  }

  private async handleUpdate(centerId: number, token: string, update: any) {
    const msg = update.message;
    if (!msg || !msg.text) return;

    const chatId = msg.chat.id;
    const from = msg.from || {};
    const text = msg.text.trim();
    const firstName = from.first_name || '';
    const lastName = from.last_name || '';
    const username = from.username || '';

    // Store chat
    await this.chatModel.upsert({
      center_id: centerId,
      chat_id: chatId,
      first_name: firstName,
      last_name: lastName,
      username,
      is_active: true,
    });

    // Store incoming message
    await this.messageModel.create({
      center_id: centerId,
      chat_id: chatId,
      from_bot: false,
      text,
    });

    // Handle /start
    if (text === '/start' || text.startsWith('/start ')) {
      const apiBase = process.env.API_URL || 'https://api.ilmify-edu.uz';
      await this.callTelegramApi(centerId, 'sendMessage', {
        chat_id: chatId,
        text:
          `Assalomu alaykum! Ilmify Education botiga xush kelibsiz.\n\n` +
          `Bu bot orqali siz o'qish jarayoningizni kuzatishingiz mumkin.\n\n` +
          `Ilova: ${apiBase}`,
      });
    }
  }

  async sendToChat(centerId: number, chatId: number, text: string): Promise<boolean> {
    try {
      await this.callTelegramApi(centerId, 'sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      });
      // Store outgoing message
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

  private async callTelegramApi(centerId: number, method: string, params: any): Promise<any> {
    const instance = this.bots.get(centerId);
    if (!instance) throw new Error(`Bot not running for center ${centerId}`);
    const url = `https://api.telegram.org/bot${instance.token}/${method}`;
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

  async onModuleDestroy() {
    for (const [centerId] of this.bots) {
      await this.stopBot(centerId);
    }
  }
}
