import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import { AutoNotificationConfigModel } from './entities/auto-notification-config.entity';
import { AutoNotificationLogModel } from './entities/auto-notification-log.entity';
import { BotManagerService } from '../telegram-bot/bot-manager.service';
import { NotificationService } from '../notification/notification.service';
import { PaymentService } from '../payments/payment.service';
import { StudentModel } from '../students/model/student.entity';
import { GroupModel } from '../groups/model/group.entity';
import { TelegramChatModel } from '../telegram-bot/entities/telegram-chat.entity';

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
    @InjectModel(TelegramChatModel)
    private chatModel: typeof TelegramChatModel,
    @InjectModel(GroupModel)
    private groupModel: typeof GroupModel,
    private botManager: BotManagerService,
    private notificationService: NotificationService,
    private paymentService: PaymentService,
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

    // 1. Find ALL groups with monthly_price > 0 (any center — some groups may have center_id=null)
    const groups = await this.groupModel.findAll({
      where: { monthly_price: { [Op.gt]: 0 } },
      attributes: ['id', 'name', 'monthly_price'],
    });
    if (groups.length === 0) {
      this.logger.log(`Center ${centerId}: Oylik narxi bo'lgan guruh topilmadi`);
      await this.logModel.create({ center_id: centerId, student_id: 0, notification_type: config.notification_type, scheduled_time: now, telegram_sent: false, delivered: false, message_text: 'Oylik narxi bo\'lgan guruh topilmadi' });
      return;
    }

    // 2. Use exact same logic as /payments/groups/:id endpoint for each group
    //    Collect all unpaid students across all groups
    const unpaidEntries: Array<{
      student: { id: number; first_name: string; last_name: string; phone_number: string };
      group: { id: number; name: string; monthly_price: number };
      debt: number;
      status: string;
    }> = [];

    for (const group of groups) {
      try {
        const groupPayments = await this.paymentService.findByGroup(Number(group.id), month, year);
        for (const entry of groupPayments) {
          if (entry.status !== 'paid' && Number(entry.debt) > 0) {
            unpaidEntries.push({
              student: { id: Number(entry.student.id), first_name: entry.student.first_name, last_name: entry.student.last_name, phone_number: entry.student.phone_number },
              group: { id: Number(entry.group.id), name: entry.group.name, monthly_price: Number(entry.group.monthly_price) },
              debt: Number(entry.debt),
              status: entry.status,
            });
          }
        }
      } catch (e) {
        this.logger.warn(`Group ${group.id} (${group.name}) xatosi: ${e.message}`);
      }
    }

    if (unpaidEntries.length === 0) {
      this.logger.log(`Center ${centerId}: To'lov qilmagan student topilmadi`);
      await this.logModel.create({ center_id: centerId, student_id: 0, notification_type: config.notification_type, scheduled_time: now, telegram_sent: false, delivered: false, message_text: 'To\'lov qilmagan student topilmadi' });
      return;
    }

    // 3. Filter — faqat shu centerdagi studentlar
    const allStudentIds = [...new Set(unpaidEntries.map(e => e.student.id))];
    const centerStudents = await this.studentModel.findAll({
      where: { id: allStudentIds, center_id: centerId, isActive: true },
      attributes: ['id', 'first_name', 'last_name', 'phone_number'],
    });
    if (centerStudents.length === 0) {
      this.logger.log(`Center ${centerId}: Bu markazga tegishli faol student topilmadi`);
      await this.logModel.create({ center_id: centerId, student_id: 0, notification_type: config.notification_type, scheduled_time: now, telegram_sent: false, delivered: false, message_text: 'Bu markazga tegishli faol student topilmadi' });
      return;
    }

    const centerStudentIds = new Set(centerStudents.map(s => Number(s.id)));
    const filteredEntries = unpaidEntries.filter(e => centerStudentIds.has(e.student.id));

    if (filteredEntries.length === 0) {
      this.logger.log(`Center ${centerId}: Markaz studentlari to'lov qilgan`);
      await this.logModel.create({ center_id: centerId, student_id: 0, notification_type: config.notification_type, scheduled_time: now, telegram_sent: false, delivered: false, message_text: 'Markaz studentlari to\'lov qilgan' });
      return;
    }

    // 4. Send notifications
    let sentCount = 0;
    let failedCount = 0;
    let noTelegramCount = 0;

    for (const entry of filteredEntries) {
      const sid = entry.student.id;
      const summa = Math.floor(entry.debt).toLocaleString();
      const messageText = this.replacePlaceholders(template, entry.student, entry.group.name, summa);

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