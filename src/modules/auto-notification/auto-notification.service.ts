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
    @InjectModel(TelegramChatModel)
    private chatModel: typeof TelegramChatModel,
    @InjectModel(PaymentModel)
    private paymentModel: typeof PaymentModel,
    @InjectModel(GroupModel)
    private groupModel: typeof GroupModel,
    private botManager: BotManagerService,
    private notificationService: NotificationService,
  ) {}

  @Cron('*/2 * * * *', { timeZone: 'Asia/Tashkent' })
  async scheduledNotificationCheck() {
    const now = new Date();
    const tashkentTime = now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' });
    const t = new Date(tashkentTime);
    const currentHHMM = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;

    this.logger.log(`Cron check at ${currentHHMM} Tashkent time`);

    const configs = await this.configModel.findAll({ where: { enabled: true } });
    if (configs.length === 0) {
      this.logger.log('No enabled auto-notification configs found');
      return;
    }

    for (const config of configs) {
      let times: string[];
      try {
        times = JSON.parse(config.send_times);
      } catch {
        this.logger.warn(`Invalid send_times for center ${config.center_id}: ${config.send_times}`);
        continue;
      }

      if (times.includes(currentHHMM)) {
        this.logger.log(`==========================`);
        this.logger.log(`AUTO NOTIFICATION TRIGGERED for center ${config.center_id} at ${currentHHMM}`);
        await this.processPaymentReminders(config).catch((e) =>
          this.logger.error(`Center ${config.center_id} error: ${e.message}`, e.stack),
        );
        this.logger.log(`==========================`);
      }
    }
  }

  async triggerManual(centerId: number) {
    this.logger.log(`Manual trigger for center ${centerId}`);
    const config = await this.getConfig(centerId);
    await this.processPaymentReminders(config);
    return { success: true, message: 'Test jo\'natildi' };
  }

  private async processPaymentReminders(config: AutoNotificationConfigModel) {
    const centerId = config.center_id;
    const template = config.message_template;
    if (!template) {
      this.logger.warn(`Center ${centerId}: No message template`);
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const unpaidPayments = await this.paymentModel.findAll({
      where: { month, year, status: { [Op.ne]: 'paid' } },
    });

    if (unpaidPayments.length === 0) {
      this.logger.log(`Center ${centerId}: No unpaid payments found for ${year}-${month}`);
      await this.logModel.create({
        center_id: centerId,
        student_id: 0,
        notification_type: config.notification_type,
        scheduled_time: now,
        telegram_sent: false,
        delivered: false,
        message_text: 'To\'lov qilmagan student topilmadi',
      });
      return;
    }

    const allStudentIds = [...new Set(unpaidPayments.map(p => Number(p.student_id)))];
    const students = await this.studentModel.findAll({
      where: { id: allStudentIds, isActive: true },
    });

    if (students.length === 0) {
      this.logger.log(`Center ${centerId}: No active unpaid students found`);
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

    this.logger.log(`Center ${centerId}: ${unpaidPayments.length} unpaid payments, ${students.length} active students`);

    // Build payment map: student_id -> { amount, group_id }
    const paymentMap = new Map<number, { amount: number; group_id: number | null }>();
    for (const p of unpaidPayments) {
      const sid = Number(p.student_id);
      if (!paymentMap.has(sid)) {
        paymentMap.set(sid, { amount: Number(p.amount), group_id: p.group_id ? Number(p.group_id) : null });
      }
    }

    // Build group map: group_id -> name
    const groupIds = [...new Set(unpaidPayments.map(p => p.group_id).filter(Boolean).map(Number))];
    const groupMap = new Map<number, string>();
    if (groupIds.length > 0) {
      const groups = await this.groupModel.findAll({ where: { id: groupIds }, attributes: ['id', 'name'] });
      for (const g of groups) {
        groupMap.set(Number(g.id), g.name);
      }
    }

    let sentCount = 0;
    let failedCount = 0;
    let noTelegramCount = 0;

    for (const student of students) {
      const studentJson = student.toJSON();
      const sid = Number(studentJson.id);
      const paymentData = paymentMap.get(sid);
      const groupName = paymentData?.group_id ? (groupMap.get(paymentData.group_id) || '') : '';
      const summa = paymentData ? Math.floor(paymentData.amount).toLocaleString() : '0';

      const messageText = this.replacePlaceholders(template, studentJson, groupName, summa);

      const chat = await this.chatModel.findOne({
        where: { student_id: sid },
      });

      let telegramSent = false;
      let telegramError: string | null = null;

      if (chat && config.send_telegram) {
        try {
          const result = await this.botManager.sendToChat(centerId, chat.chat_id, messageText);
          telegramSent = result;
          if (!result) {
            telegramError = 'Telegram API jo\'natishda xatolik';
            this.logger.warn(`Center ${centerId}, student ${studentJson.id}: Telegram send failed`);
          } else {
            sentCount++;
          }
        } catch (e) {
          telegramError = e.message;
          this.logger.error(`Center ${centerId}, student ${studentJson.id}: ${e.message}`);
        }
      } else if (!chat) {
        noTelegramCount++;
      }

      // Send in-app notification too
      try {
        await this.notificationService.send({
          student_id: studentJson.id,
          center_id: centerId,
          title: 'To\'lov eslatmasi',
          description: messageText,
          role: 'student',
          sender_type: 'system',
        });
      } catch (e) {
        this.logger.warn(`In-app notification failed for student ${studentJson.id}: ${e.message}`);
      }

      await this.logModel.create({
        center_id: centerId,
        student_id: studentJson.id,
        notification_type: config.notification_type,
        scheduled_time: now,
        telegram_chat_id: chat ? chat.chat_id : null,
        telegram_sent: telegramSent,
        telegram_error: telegramError,
        delivered: telegramSent,
        message_text: messageText,
      });
    }

    this.logger.log(`Center ${centerId}: Sent=${sentCount}, Failed=${failedCount}, NoTelegram=${noTelegramCount}`);
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
