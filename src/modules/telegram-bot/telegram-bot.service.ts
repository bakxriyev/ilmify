import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
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
    private sequelize: Sequelize,
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
  async getChats(centerId: number, search?: string): Promise<any[]> {
    const where: any = { center_id: centerId };
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { phone_number: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const chats = await this.chatModel.findAll({
      where,
      order: [['created_at', 'DESC']],
    });

    // Deduplicate by chat_id — keep the record with student_id linked (prefer that),
    // otherwise keep the most recent one
    const best = new Map<number, any>();
    for (const c of chats) {
      const key = Number(c.chat_id);
      const existing = best.get(key);
      // Prefer record that has student_id linked, else the most recent
      if (!existing || (c.student_id && !existing.student_id)) {
        best.set(key, c);
      }
    }

    const result = [];
    for (const c of best.values()) {
      const item: any = c.toJSON();
      if (item.student_id) {
        try {
          const student = await this.studentModel.findByPk(item.student_id, {
            attributes: ['id', 'first_name', 'last_name', 'phone_number'],
          });
          if (student) {
            item.student_name = `${student.first_name} ${student.last_name || ''}`.trim();
            item.student_phone = student.phone_number;
          }
        } catch {}
      }
      result.push(item);
    }
    return result;
  }

  async deleteChat(centerId: number, chatId: number): Promise<{ deleted: boolean }> {
    const deleted = await this.chatModel.destroy({
      where: { center_id: centerId, chat_id: chatId },
    });
    await this.messageModel.destroy({
      where: { center_id: centerId, chat_id: chatId },
    });
    return { deleted: deleted > 0 };
  }

  async deleteAllChats(centerId: number): Promise<{ deleted: number }> {
    const chats = await this.chatModel.findAll({
      where: { center_id: centerId },
      attributes: ['chat_id'],
    });
    const chatIds = chats.map(c => c.chat_id);
    if (chatIds.length === 0) return { deleted: 0 };

    const msgDeleted = await this.messageModel.destroy({
      where: { center_id: centerId, chat_id: { [Op.in]: chatIds } },
    });
    const chatDeleted = await this.chatModel.destroy({
      where: { center_id: centerId },
    });
    return { deleted: chatDeleted };
  }

  // ─── Inbox ───────────────────────────────────────────────
  async getInbox(centerId: number, search?: string): Promise<any[]> {
    const messages = await this.messageModel.findAll({
      where: { center_id: centerId, from_bot: false },
      order: [['created_at', 'DESC']],
      limit: 200,
    });

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
    return this.botManager.sendToChat(centerId, chatId, text);
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

  // ─── Auth ─────────────────────────────────────────────────
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

  private normalizePhone(phone: string): string {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('998') && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    } else if (cleaned.startsWith('8') && cleaned.length === 12) {
      cleaned = '+998' + cleaned.substring(1);
    } else if (cleaned.startsWith('8') && cleaned.length === 11) {
      cleaned = '+998' + cleaned.substring(1);
    }
    return cleaned;
  }

  async getStudentByPhone(centerId: number, phone_number: string): Promise<StudentModel | null> {
    return this.studentModel.findOne({
      where: { phone_number, center_id: centerId },
      attributes: ['id', 'first_name', 'last_name', 'phone_number', 'center_id', 'password'],
    });
  }

  async verifyPassword(centerId: number, phone_number: string, password: string): Promise<{ success: boolean; student?: any }> {
    try {
      const normalizedPhone = this.normalizePhone(phone_number);
      const searchPatterns = [
        normalizedPhone,
        normalizedPhone.replace(/^\+/, ''),
        normalizedPhone.replace(/^\+998/, '998'),
      ].filter(Boolean);

      const student = await this.studentModel.findOne({
        where: {
          phone_number: { [Op.in]: searchPatterns },
          center_id: centerId,
        },
        attributes: ['id', 'first_name', 'last_name', 'phone_number', 'center_id', 'password'],
        raw: true,
      });
      if (!student) {
        return { success: false };
      }
      if (String(student.password) !== String(password)) {
        return { success: false };
      }
      const { password: _, ...safe } = student;
      return { success: true, student: safe };
    } catch (err) {
      console.error('verifyPassword error:', err);
      return { success: false };
    }
  }

  async checkPhone(centerId: number, phone: string): Promise<{ exists: boolean; student?: any }> {
    const normalizedPhone = this.normalizePhone(phone);
    const searchPatterns = [
      normalizedPhone,
      normalizedPhone.replace(/^\+/, ''),
      normalizedPhone.replace(/^\+998/, '998'),
    ].filter(Boolean);

    const student = await this.studentModel.findOne({
      where: {
        phone_number: { [Op.in]: searchPatterns },
        center_id: centerId,
      },
      attributes: ['id', 'first_name', 'last_name', 'center_id'],
    });
    if (!student) return { exists: false };
    return { exists: true, student: student.toJSON() };
  }

  async getChatStatus(centerId: number, chatId: number): Promise<{ authenticated: boolean; student?: any }> {
    const chat = await this.chatModel.findOne({
      where: { center_id: centerId, chat_id: chatId },
    });
    if (!chat || !chat.student_id) return { authenticated: false };
    const student = await this.studentModel.findByPk(chat.student_id, {
      attributes: ['id', 'first_name', 'last_name'],
    });
    return { authenticated: true, student: student?.toJSON() || null };
  }

  async linkStudent(centerId: number, data: {
    chat_id: number; student_id: number; first_name?: string; last_name?: string; username?: string;
  }): Promise<void> {
    const existing = await this.chatModel.findOne({
      where: { center_id: centerId, chat_id: data.chat_id },
    });
    if (existing) {
      existing.student_id = data.student_id;
      if (data.first_name) existing.first_name = data.first_name;
      if (data.last_name) existing.last_name = data.last_name;
      if (data.username) existing.username = data.username;
      existing.is_active = true;
      await existing.save();
    } else {
      await this.chatModel.create({
        center_id: centerId,
        chat_id: data.chat_id,
        student_id: data.student_id,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        username: data.username || '',
        is_active: true,
      });
    }
  }

  // ─── Student Profile ─────────────────────────────────────
  async getStudentProfile(centerId: number, studentId: number): Promise<any> {
    const student = await this.studentModel.findByPk(studentId, {
      attributes: ['id', 'first_name', 'last_name', 'phone_number', 'center_id', 'group_id'],
    });
    if (!student) throw new NotFoundException('Student topilmadi');
    const s = student.toJSON();

    let group_name = '';
    let teacher_name = '';
    let center_name = '';

    try {
      if (s.group_id) {
        const GroupModel = this.sequelize.model('GroupModel') as any;
        if (GroupModel) {
          const group = await GroupModel.findByPk(s.group_id, {
            attributes: ['name', 'teacher_id'],
          });
          if (group) {
            group_name = group.name;
            if (group.teacher_id) {
              const TeacherModel = this.sequelize.model('TeacherModel') as any;
              if (TeacherModel) {
                const teacher = await TeacherModel.findByPk(group.teacher_id, {
                  attributes: ['first_name', 'last_name'],
                });
                if (teacher) {
                  teacher_name = `${teacher.first_name} ${teacher.last_name}`.trim();
                }
              }
            }
          }
        }
      }
    } catch { }

    try {
      const CenterModel = this.sequelize.model('EducationCenterModel') as any;
      if (CenterModel) {
        const center = await CenterModel.findByPk(centerId, { attributes: ['name'] });
        if (center) center_name = center.name;
      }
    } catch { }

    return { ...s, group_name, teacher_name, center_name };
  }

  // ─── Attendance ───────────────────────────────────────────
  async getStudentAttendance(centerId: number, studentId: number): Promise<any[]> {
    try {
      const AttendanceModel = this.sequelize.model('AttendanceModel') as any;
      if (!AttendanceModel) return [];

      const records = await AttendanceModel.findAll({
        where: { student_id: studentId },
        order: [['date', 'DESC']],
        limit: 60,
      });
      return records.map((r: any) => ({
        date: r.date,
        is_present: r.is_present,
        reason: r.reason || '',
      }));
    } catch (err) {
      this.logger.error(`Attendance error: ${err.message}`);
      return [];
    }
  }

  // ─── Payments ────────────────────────────────────────────
  async getStudentPayments(centerId: number, studentId: number): Promise<any[]> {
    try {
      const PaymentModel = this.sequelize.model('PaymentModel') as any;
      if (!PaymentModel) return [];
      const payments = await PaymentModel.findAll({
        where: { student_id: studentId, center_id: centerId },
        order: [['year', 'DESC'], [Sequelize.literal('"payments"."month"::int DESC')]],
        limit: 24,
      });
      return payments.map((p: any) => ({
        amount: p.amount,
        month: p.month,
        year: p.year,
        status: p.status,
        paid_at: p.paid_at,
        note: p.note,
      }));
    } catch {
      return [];
    }
  }

  // ─── Groups ──────────────────────────────────────────────
  async getStudentGroups(centerId: number, studentId: number): Promise<any[]> {
    try {
      const GroupStudentModel = this.sequelize.model('GroupStudentModel') as any;
      if (!GroupStudentModel) return [];

      const gs = await GroupStudentModel.findAll({
        where: { student_id: studentId, left_date: null },
        include: [
          {
            model: this.sequelize.model('GroupModel') as any,
            attributes: ['id', 'name', 'monthly_price'],
            include: [
              {
                model: this.sequelize.model('TeacherModel') as any,
                as: 'mainTeacher',
                attributes: ['first_name', 'last_name', 'phone_number'],
              },
            ],
          },
        ],
      });

      return gs.map((g: any) => {
        const group = g.group || {};
        return {
          id: group.id,
          name: group.name || '',
          monthly_price: group.monthly_price,
          teacher_name: group.mainTeacher
            ? `${group.mainTeacher.first_name || ''} ${group.mainTeacher.last_name || ''}`.trim()
            : '',
          teacher_phone: group.mainTeacher?.phone_number || '',
        };
      });
    } catch (err) {
      this.logger.error(`Groups error: ${err.message}`);
      return [];
    }
  }

  async getGroupSchedule(centerId: number, groupId: number): Promise<any[]> {
    try {
      const LessonModel = this.sequelize.model('GroupLessonModel') as any;
      if (!LessonModel) return [];

      const lessons = await LessonModel.findAll({
        where: { group_id: groupId },
        attributes: ['date', 'start_time', 'end_time', 'parity'],
        order: [['date', 'ASC']],
        limit: 20,
      });
      return lessons.map((l: any) => ({
        date: l.date,
        start_time: l.start_time,
        end_time: l.end_time,
        parity: l.parity,
      }));
    } catch {
      return [];
    }
  }

  // ─── Grades ──────────────────────────────────────────────
  async getStudentGrades(centerId: number, studentId: number): Promise<any[]> {
    const grades: any[] = [];

    try {
      const ExerciseResultModel = this.sequelize.model('ExerciseResultModel') as any;
      if (ExerciseResultModel) {
        const results = await ExerciseResultModel.findAll({
          where: { student_id: studentId },
          order: [['completed_at', 'DESC']],
          limit: 30,
          include: [
            {
              model: this.sequelize.model('UnitModel') as any,
              attributes: ['name', 'title'],
            },
          ],
        });
        for (const r of results) {
          grades.push({
            type: 'exercise',
            subject: r.unit?.title || r.unit?.name || 'Mashq',
            score: `${Math.round(r.percentage || 0)}%`,
            date: r.completed_at,
          });
        }
      }
    } catch { }

    try {
      const UnitResultModel = this.sequelize.model('UnitResultModel') as any;
      if (UnitResultModel) {
        const results = await UnitResultModel.findAll({
          where: { student_id: studentId },
          order: [['completed_at', 'DESC']],
          limit: 20,
          include: [
            {
              model: this.sequelize.model('UnitModel') as any,
              attributes: ['name', 'title'],
            },
          ],
        });
        for (const r of results) {
          grades.push({
            type: 'unit',
            subject: r.unit?.title || r.unit?.name || 'Modul',
            score: `${Math.round(r.percentage || 0)}%`,
            date: r.completed_at,
          });
        }
      }
    } catch { }

    grades.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    return grades.slice(0, 40);
  }

  // ─── Contact Admin ──────────────────────────────────────
  async contactAdmin(centerId: number, chatId: number, text: string): Promise<void> {
    await this.messageModel.create({
      center_id: centerId,
      chat_id: chatId,
      from_bot: false,
      text: `[Admin xabari] ${text}`,
      message_type: 'contact_admin',
    });
  }
}
