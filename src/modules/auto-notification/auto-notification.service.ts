import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import { AutoNotificationConfigModel } from './entities/auto-notification-config.entity';
import { AutoNotificationLogModel } from './entities/auto-notification-log.entity';
import { BotManagerService } from '../telegram-bot/bot-manager.service';
import { NotificationService } from '../notification/notification.service';
import { StudentModel } from '../students/model/student.entity';
import { GroupModel } from '../groups/model/group.entity';
import { GroupStudentModel } from '../group_student_model';
import { TelegramChatModel } from '../telegram-bot/entities/telegram-chat.entity';
import { PaymentModel } from '../payments/entities/payment.entity';

@Injectable()
export class AutoNotificationService {
  private readonly logger = new Logger(AutoNotificationService.name);

  constructor(
    @InjectModel(AutoNotificationConfigModel)
    private configModel: typeof AutoNotificationConfigModel,
    @InjectModel(AutoNotificationLogModel)
    private logModel: typeof AutoNotificationLogModel,
    @InjectModel(StudentModel)
    private studentModel: typeof StudentModel,
    @InjectModel(GroupStudentModel)
    private groupStudentModel: typeof GroupStudentModel,
    @InjectModel(TelegramChatModel)
    private chatModel: typeof TelegramChatModel,
    @InjectModel(PaymentModel)
    private paymentModel: typeof PaymentModel,
    @InjectModel(GroupModel)
    private groupModel: typeof GroupModel,
    private botManager: BotManagerService,
    private notificationService: NotificationService,
  ) {}

  @Cron('* * * * *', { timeZone: 'Asia/Tashkent' })
  async scheduledNotificationCheck() {
    const now = new Date();
    const tashkentOffset = 5 * 60;
    const totalMin = (now.getUTCHours() * 60 + now.getUTCMinutes() + tashkentOffset) % (24 * 60);
    const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const mm = String(totalMin % 60).padStart(2, '0');
    const currentHHMM = `${hh}:${mm}`;

    this.logger.log(`[CRON] Tashkent vaqti: ${currentHHMM}`);

    const configs = await this.configModel.findAll({ where: { enabled: true } });
    if (configs.length === 0) return;

    for (const config of configs) {
      let times: string[];
      try {
        times = JSON.parse(config.send_times);
      } catch {
        this.logger.warn(`Invalid send_times for center ${config.center_id}`);
        continue;
      }

      if (times.includes(currentHHMM)) {
        this.logger.log(`[CRON] => Center ${config.center_id} uchun ${currentHHMM} da jo'natish boshlandi`);
        await this.processPaymentReminders(config).catch((e) =>
          this.logger.error(`Center ${config.center_id} error: ${e.message}`, e.stack),
        );
      }
    }
  }

  async triggerManual(centerId: number) {
    this.logger.log(`[MANUAL] Center ${centerId}`);
    const config = await this.getConfig(centerId);
    await this.processPaymentReminders(config);
    return { success: true, message: 'Test jo\'natildi' };
  }

  private async processPaymentReminders(config: AutoNotificationConfigModel) {
    const centerId = config.center_id;
    const template = config.message_template;
    if (!template) {
      this.logger.warn(`Center ${centerId}: Xabar matni yo'q`);
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // 1. Find all groups with monthly_price > 0 for this center
    const groups = await this.groupModel.findAll({
      where: { center_id: centerId, monthly_price: { [Op.gt]: 0 } },
      attributes: ['id', 'name', 'monthly_price'],
    });
    if (groups.length === 0) {
      this.logger.log(`Center ${centerId}: Oylik narxi bo'lgan guruh topilmadi`);
      await this.logModel.create({
        center_id: centerId,
        student_id: 0,
        notification_type: config.notification_type,
        scheduled_time: now,
        telegram_sent: false,
        delivered: false,
        message_text: 'Oylik narxi bo\'lgan guruh topilmadi',
      });
      return;
    }

    const groupIds = groups.map(g => Number(g.id));
    const groupMap = new Map<number, { name: string; monthly_price: number }>();
    for (const g of groups) {
      groupMap.set(Number(g.id), { name: g.name, monthly_price: Number(g.monthly_price) });
    }

    // 2. Find all students in those groups
    const groupStudents = await this.groupStudentModel.findAll({
      where: { group_id: groupIds },
      attributes: ['student_id', 'group_id'],
    });
    if (groupStudents.length === 0) {
      this.logger.log(`Center ${centerId}: Guruhlarga biriktirilgan student yo'q`);
      await this.logModel.create({
        center_id: centerId,
        student_id: 0,
        notification_type: config.notification_type,
        scheduled_time: now,
        telegram_sent: false,
        delivered: false,
        message_text: 'Guruhlarga biriktirilgan student yo\'q',
      });
      return;
    }

    // student_id -> group_id mapping (take first group if multiple)
    const studentToGroupMap = new Map<number, number>();
    for (const gs of groupStudents) {
      const sid = Number(gs.student_id);
      if (!studentToGroupMap.has(sid)) {
        studentToGroupMap.set(sid, Number(gs.group_id));
      }
    }

    const allStudentIds = [...studentToGroupMap.keys()];

    // 3. Get student details (filter by center_id and isActive)
    const students = await this.studentModel.findAll({
      where: { id: allStudentIds, center_id: centerId, isActive: true },
      attributes: ['id', 'first_name', 'last_name', 'phone_number'],
    });
    if (students.length === 0) {
      this.logger.log(`Center ${centerId}: Faol student topilmadi`);
      await this.logModel.create({
        center_id: centerId,
        student_id: 0,
        notification_type: config.notification_type,
        scheduled_time: now,
        telegram_sent: false,
        delivered: false,
        message_text: 'Faol student topilmadi',
      });
      return;
    }

    const activeStudentIds = students.map(s => Number(s.id));

    // 4. Get payments for these students for current month
    const payments = await this.paymentModel.findAll({
      where: { month, year, student_id: activeStudentIds },
    });

    // Build payment map: student_id -> { amount, group_id, status }
    const paymentMap = new Map<number, { amount: number; group_id: number | null; status: string }>();
    for (const p of payments) {
      const sid = Number(p.student_id);
      if (!paymentMap.has(sid)) {
        paymentMap.set(sid, {
          amount: Number(p.amount),
          group_id: p.group_id ? Number(p.group_id) : null,
          status: p.status,
        });
      }
    }

    // 5. For each student, determine if unpaid and calculate debt
    const unpaidStudents: Array<{
      student: any;
      debt: number;
      groupName: string;
    }> = [];

    for (const student of students) {
      const sid = Number(student.id);
      const gid = studentToGroupMap.get(sid);
      const groupInfo = gid ? groupMap.get(gid) : null;
      const monthlyPrice = groupInfo?.monthly_price || 0;
      const paymentData = paymentMap.get(sid);

      // Unpaid if: no payment record OR payment status is not 'paid'
      const isPaid = paymentData && paymentData.status === 'paid';

      if (!isPaid) {
        const paidAmount = paymentData ? paymentData.amount : 0;
        const debt = Math.max(0, monthlyPrice - paidAmount);
        unpaidStudents.push({
          student,
          debt,
          groupName: groupInfo?.name || '',
        });
      }
    }

    if (unpaidStudents.length === 0) {
      this.logger.log(`Center ${centerId}: Barcha studentlar to'lov qilgan`);
      await this.logModel.create({
        center_id: centerId,
        student_id: 0,
        notification_type: config.notification_type,
        scheduled_time: now,
        telegram_sent: false,
        delivered: false,
        message_text: 'Barcha studentlar to\'lov qilgan',
      });
      return;
    }

    // 6. Send notifications
    let sentCount = 0;
    let failedCount = 0;
    let noTelegramCount = 0;

    for (const { student, debt, groupName } of unpaidStudents) {
      const sid = Number(student.id);
      const summa = Math.floor(debt).toLocaleString();
      const messageText = this.replacePlaceholders(template, student, groupName, summa);

      const chat = await this.chatModel.findOne({
        where: { student_id: sid, center_id: centerId },
      });

      let telegramSent = false;
      let telegramError: string | null = null;

      if (chat && config.send_telegram) {
        try {
          const result = await this.botManager.sendToChat(centerId, chat.chat_id, messageText);
          telegramSent = result;
          if (!result) {
            telegramError = 'Telegram API jo\'natishda xatolik';
            this.logger.warn(`Center ${centerId}, student ${sid}: Telegram send failed`);
            failedCount++;
          } else {
            sentCount++;
          }
        } catch (e) {
          telegramError = e.message;
          this.logger.error(`Center ${centerId}, student ${sid}: ${e.message}`);
          failedCount++;
        }
      } else if (chat && !config.send_telegram) {
        noTelegramCount++;
      } else {
        noTelegramCount++;
      }

      try {
        await this.notificationService.send({
          student_id: sid,
          center_id: centerId,
          title: 'To\'lov eslatmasi',
          description: messageText,
          role: 'student',
          sender_type: 'system',
        });
      } catch (e) {
        this.logger.warn(`In-app notification failed for student ${sid}: ${e.message}`);
      }

      await this.logModel.create({
        center_id: centerId,
        student_id: sid,
        notification_type: config.notification_type,
        scheduled_time: now,
        telegram_chat_id: chat ? chat.chat_id : null,
        telegram_sent: telegramSent,
        telegram_error: telegramError,
        delivered: telegramSent,
        message_text: messageText,
      });
    }

    this.logger.log(`[DONE] Center ${centerId}: Sent=${sentCount}, Failed=${failedCount}, NoTelegram=${noTelegramCount}`);
  }

  private replacePlaceholders(template: string, student: any, groupName = '', summa = ''): string {
    return template
      .replace(/{ism}/g, student.first_name || '')
      .replace(/{familiya}/g, student.last_name || '')
      .replace(/{tel}/g, student.phone_number || '')
      .replace(/{guruh}/g, groupName)
      .replace(/{summa}/g, summa);
  }

  async getConfig(centerId: number): Promise<AutoNotificationConfigModel> {
    let config = await this.configModel.findOne({ where: { center_id: centerId } });
    if (!config) {
      config = await this.configModel.create({
        center_id: centerId,
        notification_type: 'payment_reminder',
        enabled: false,
        send_times: JSON.stringify(['09:00', '14:00', '20:00']),
        message_template: 'Assalomu alaykum, {ism}! Sizning to\'lovingiz muddati o\'tgan. Iltimos, o\'quv markaziga murojaat qiling.',
        send_telegram: true,
        timezone: 'Asia/Tashkent',
      });
    }
    return config;
  }

  async updateConfig(centerId: number, data: Partial<AutoNotificationConfigModel>): Promise<AutoNotificationConfigModel> {
    const config = await this.getConfig(centerId);
    if (data.send_times && typeof data.send_times === 'object') {
      data.send_times = JSON.stringify(data.send_times);
    }
    await config.update(data);
    return config;
  }

  async getLogs(centerId: number, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const { rows, count } = await this.logModel.findAndCountAll({
      where: { center_id: centerId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
    return { data: rows, total: count, page, limit };
  }

  async getStats(centerId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalLogs = await this.logModel.count({ where: { center_id: centerId } });
    const todayLogs = await this.logModel.count({
      where: { center_id: centerId, createdAt: { [Op.gte]: today } },
    });
    const totalSent = await this.logModel.count({
      where: { center_id: centerId, telegram_sent: true },
    });
    const totalFailed = await this.logModel.count({
      where: { center_id: centerId, telegram_sent: false, telegram_chat_id: { [Op.ne]: null } },
    });
    const noTelegram = await this.logModel.count({
      where: { center_id: centerId, telegram_chat_id: null },
    });

    const last7Days = await this.logModel.findAll({
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN telegram_sent THEN 1 ELSE 0 END')), 'sent'],
      ],
      where: { center_id: centerId, createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']],
      raw: true,
    });

    return {
      totalLogs,
      todayLogs,
      totalSent,
      totalFailed,
      noTelegram,
      last7Days,
      today: todayLogs,
    };
  }
}
