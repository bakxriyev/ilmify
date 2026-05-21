import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { TelegramBotModel } from './entities/telegram-bot.entity';
import { TelegramChatModel } from './entities/telegram-chat.entity';
import { TelegramMessageModel } from './entities/telegram-message.entity';
import { TelegramTemplateModel } from './entities/telegram-template.entity';
import { TelegramBroadcastModel } from './entities/telegram-broadcast.entity';
import { StudentModel } from '../students/model/student.entity';
import { BotManagerService } from './bot-manager.service';

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);

  constructor(
    @InjectModel(TelegramBotModel)
    private botModel: typeof TelegramBotModel,
    @InjectModel(TelegramChatModel)
    private chatModel: typeof TelegramChatModel,
    @InjectModel(TelegramMessageModel)
    private messageModel: typeof TelegramMessageModel,
    @InjectModel(TelegramTemplateModel)
    private templateModel: typeof TelegramTemplateModel,
    @InjectModel(TelegramBroadcastModel)
    private broadcastModel: typeof TelegramBroadcastModel,
    @InjectModel(StudentModel)
    private studentModel: typeof StudentModel,
    private botManager: BotManagerService,
  ) {}

  // ─── Bot Settings ────────────────────────────────────────
  async getBotConfig(centerId: number): Promise<TelegramBotModel> {
    let bot = await this.botModel.findOne({ where: { center_id: centerId } });
    if (!bot) {
      bot = await this.botModel.create({ center_id: centerId, bot_token: '', is_active: false });
    }
    return bot;
  }

  async updateBotConfig(centerId: number, data: { bot_token?: string; is_active?: boolean }): Promise<TelegramBotModel> {
    let bot = await this.botModel.findOne({ where: { center_id: centerId } });
    if (!bot) {
      bot = await this.botModel.create({ center_id: centerId, bot_token: '', is_active: false });
    }
    if (data.bot_token !== undefined) bot.bot_token = data.bot_token;
    if (data.is_active !== undefined) bot.is_active = data.is_active;
    await bot.save();

    if (data.is_active === true && data.bot_token) {
      await this.botManager.startBot(centerId, bot.bot_token);
    } else if (data.is_active === false) {
      await this.botManager.stopBot(centerId);
    }
    return bot;
  }

  // ─── Chats ───────────────────────────────────────────────
  async getChats(centerId: number, search?: string): Promise<TelegramChatModel[]> {
    const where: any = { center_id: centerId };
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { phone_number: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } },
      ];
    }
    return this.chatModel.findAll({ where, order: [['created_at', 'DESC']] });
  }

  // ─── Inbox ───────────────────────────────────────────────
  async getInbox(centerId: number, search?: string): Promise<any[]> {
    // Get latest message from each unique chat (from users, not bot)
    const messages = await this.messageModel.findAll({
      where: { center_id: centerId, from_bot: false },
      order: [['created_at', 'DESC']],
      limit: 200,
    });

    // Group by chat_id, keep latest
    const latestPerChat = new Map<number, any>();
    for (const msg of messages) {
      if (!latestPerChat.has(msg.chat_id)) {
        latestPerChat.set(msg.chat_id, msg);
      }
    }

    const chatIds = [...latestPerChat.keys()];
    const chats = await this.chatModel.findAll({
      where: { center_id: centerId, chat_id: { [Op.in]: chatIds } },
    });
    const chatMap = new Map(chats.map(c => [c.chat_id, c]));

    const result = [];
    for (const [chatId, lastMsg] of latestPerChat) {
      const chat = chatMap.get(chatId);
      // Get last 5 bot replies for this chat
      const replies = await this.messageModel.findAll({
        where: { center_id: centerId, chat_id: chatId, from_bot: true },
        order: [['created_at', 'DESC']],
        limit: 5,
      });
      result.push({
        chat_id: chatId,
        user: chat ? {
          first_name: chat.first_name,
          last_name: chat.last_name,
          phone_number: chat.phone_number,
          username: chat.username,
        } : null,
        last_message: lastMsg.text,
        last_message_at: lastMsg.created_at,
        replies: replies.map(r => ({ text: r.text, sent_at: r.created_at })),
      });
    }

    return result;
  }

  async sendReply(centerId: number, chatId: number, text: string): Promise<boolean> {
    const sent = await this.botManager.sendToChat(centerId, chatId, text);
    return sent;
  }

  // ─── Templates ───────────────────────────────────────────
  async getTemplates(centerId: number): Promise<TelegramTemplateModel[]> {
    return this.templateModel.findAll({
      where: { center_id: centerId },
      order: [['created_at', 'DESC']],
    });
  }

  async createTemplate(centerId: number, data: { name: string; content: string }): Promise<TelegramTemplateModel> {
    return this.templateModel.create({ center_id: centerId, ...data });
  }

  async updateTemplate(id: number, data: { name?: string; content?: string }): Promise<TelegramTemplateModel> {
    const tpl = await this.templateModel.findByPk(id);
    if (!tpl) throw new NotFoundException('Shablon topilmadi');
    if (data.name !== undefined) tpl.name = data.name;
    if (data.content !== undefined) tpl.content = data.content;
    await tpl.save();
    return tpl;
  }

  async deleteTemplate(id: number): Promise<void> {
    await this.templateModel.destroy({ where: { id } });
  }

  // ─── Broadcast / Send ────────────────────────────────────
  async getBroadcasts(centerId: number): Promise<TelegramBroadcastModel[]> {
    return this.broadcastModel.findAll({
      where: { center_id: centerId },
      order: [['created_at', 'DESC']],
      include: [{ model: TelegramTemplateModel, attributes: ['id', 'name'] }],
    });
  }

  private replacePlaceholders(text: string, student?: any): string {
    if (!student) return text;
    return text
      .replace(/\{ism\}/g, student.first_name || '')
      .replace(/\{familiya\}/g, student.last_name || '')
      .replace(/\{tel\}/g, student.phone_number || '')
      .replace(/\{guruh\}/g, student.group_name || '')
      .replace(/\{markaz\}/g, student.center_name || '');
  }

  async sendMessage(centerId: number, data: {
    target_type: string;
    target_id?: number;
    text: string;
    template_id?: number;
  }): Promise<TelegramBroadcastModel> {
    const { target_type, target_id, text, template_id } = data;

    let recipients: Array<{ chatId: number; student?: any }> = [];

    if (target_type === 'all') {
      const chats = await this.chatModel.findAll({
        where: { center_id: centerId, is_active: true },
      });
      recipients = chats.map(c => ({ chatId: c.chat_id }));
    } else if (target_type === 'group') {
      if (!target_id) throw new BadRequestException('Guruh ID kiritilmagan');
      const students = await this.studentModel.findAll({
        where: { group_id: target_id },
        attributes: ['id', 'first_name', 'last_name'],
      });
      const chats = await this.chatModel.findAll({
        where: {
          center_id: centerId,
          student_id: { [Op.in]: students.map(s => s.id) },
          is_active: true,
        },
      });
      recipients = chats.map(c => {
        const s = students.find(st => st.id === c.student_id);
        return { chatId: c.chat_id, student: s };
      });
    } else if (target_type === 'student') {
      if (!target_id) throw new BadRequestException('Student ID kiritilmagan');
      const student = await this.studentModel.findByPk(target_id, {
        attributes: ['id', 'first_name', 'last_name', 'phone_number'],
      });
      const chats = await this.chatModel.findAll({
        where: { center_id: centerId, student_id: target_id, is_active: true },
      });
      recipients = chats.map(c => ({ chatId: c.chat_id, student }));
    } else {
      throw new BadRequestException("Noto'g'ri target_type");
    }

    const broadcast = await this.broadcastModel.create({
      center_id: centerId,
      template_id: template_id || null,
      target_type,
      target_id: target_id || null,
      message_text: text,
      total_count: recipients.length,
      sent_count: 0,
      failed_count: 0,
      status: 'sending',
    });

    let sent = 0;
    let failed = 0;
    for (const rcp of recipients) {
      const personalizedText = this.replacePlaceholders(text, rcp.student);
      try {
        const ok = await this.botManager.sendToChat(centerId, rcp.chatId, personalizedText);
        if (ok) sent++; else failed++;
      } catch {
        failed++;
      }
    }

    broadcast.sent_count = sent;
    broadcast.failed_count = failed;
    broadcast.status = sent > 0 ? 'completed' : 'failed';
    broadcast.completed_at = new Date();
    await broadcast.save();

    return broadcast;
  }

  // ─── Auth Helpers ────────────────────────────────────────
  async getActiveConfigs(): Promise<{ center_id: number; bot_token: string }[]> {
    const bots = await this.botModel.findAll({
      where: { is_active: true },
      attributes: ['center_id', 'bot_token'],
    });
    return bots.map(b => ({ center_id: b.center_id, bot_token: b.bot_token }));
  }

  async handleIncomingMessage(centerId: number, body: {
    chat_id: number;
    text: string;
    first_name?: string;
    last_name?: string;
    username?: string;
  }): Promise<void> {
    await this.chatModel.upsert({
      center_id: centerId,
      chat_id: body.chat_id,
      first_name: body.first_name || '',
      last_name: body.last_name || '',
      username: body.username || '',
      is_active: true,
    });
    await this.messageModel.create({
      center_id: centerId,
      chat_id: body.chat_id,
      from_bot: false,
      text: body.text,
    });
  }

  async getStudentByPhone(phone_number: string): Promise<StudentModel | null> {
    return this.studentModel.findOne({
      where: { phone_number },
      attributes: ['id', 'first_name', 'last_name', 'phone_number', 'center_id', 'password'],
    });
  }

  async verifyPassword(phone_number: string, password: string): Promise<{ success: boolean; student?: any }> {
    const student = await this.getStudentByPhone(phone_number);
    if (!student || student.password !== password) return { success: false };
    return { success: true, student: student.toJSON() };
  }
}
