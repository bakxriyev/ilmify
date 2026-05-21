import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import { AutoNotificationConfigModel } from './entities/auto-notification-config.entity';
import { AutoNotificationLogModel } from './entities/auto-notification-log.entity';
import { BotManagerService } from '../telegram-bot/bot-manager.service';
import { StudentModel } from '../students/model/student.entity';
import { TelegramChatModel } from '../telegram-bot/entities/telegram-chat.entity';
import { PaymentModel } from '../payments/entities/payment.entity';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';

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
    @InjectModel(EducationCenterModel)
    private centerModel: typeof EducationCenterModel,
    private botManager: BotManagerService,
  ) {}

  @Cron('*/15 * * * *', { timeZone: 'Asia/Tashkent' })
  async scheduledNotificationCheck() {
    const now = new Date();
    const tashkentTime = now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' });
    const t = new Date(tashkentTime);
    const currentHHMM = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;

    const configs = await this.configModel.findAll({ where: { enabled: true } });
    for (const config of configs) {
      let times: string[];
      try {
        times = JSON.parse(config.send_times);
      } catch {
        continue;
      }
      if (times.includes(currentHHMM)) {
        this.logger.log(`Auto-notification triggered for center ${config.center_id} at ${currentHHMM}`);
        await this.processPaymentReminders(config).catch((e) =>
          this.logger.error(`Center ${config.center_id} auto-notification error: ${e.message}`),
        );
      }
    }
  }

  private async processPaymentReminders(config: AutoNotificationConfigModel) {
    const centerId = config.center_id;
    const template = config.message_template;
    if (!template) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const unpaidPayments = await this.paymentModel.findAll({
      where: { center_id: centerId, month, year, status: { [Op.ne]: 'paid' } },
    });

    const studentIds = [...new Set(unpaidPayments.map(p => p.student_id))];
    if (studentIds.length === 0) return;

    const students = await this.studentModel.findAll({
      where: { id: studentIds, center_id: centerId, isActive: true },
    });

    this.logger.log(`Center ${centerId}: Found ${students.length} unpaid students`);

    for (const student of students) {
      const studentJson = student.toJSON();
      let messageText = this.replacePlaceholders(template, studentJson);

      const chat = await this.chatModel.findOne({
        where: { student_id: studentJson.id, center_id: centerId },
      });

      let telegramSent = false;
      let telegramError: string | null = null;
      let delivered = false;

      if (chat && config.send_telegram) {
        const result = await this.botManager.sendToChat(centerId, chat.chat_id, messageText);
        telegramSent = result;
        delivered = result;
        if (!result) telegramError = 'Send failed';
      }

      await this.logModel.create({
        center_id: centerId,
        student_id: studentJson.id,
        notification_type: config.notification_type,
        scheduled_time: now,
        telegram_chat_id: chat ? chat.chat_id : null,
        telegram_sent: telegramSent,
        telegram_error: telegramError,
        delivered,
        message_text: messageText,
      });
    }
  }

  private replacePlaceholders(template: string, student: any): string {
    return template
      .replace(/{ism}/g, student.first_name || '')
      .replace(/{familiya}/g, student.last_name || '')
      .replace(/{tel}/g, student.phone_number || '')
      .replace(/{guruh}/g, student.group_name || '')
      .replace(/{markaz}/g, student.center_name || '')
      .replace(/{summa}/g, '');
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
