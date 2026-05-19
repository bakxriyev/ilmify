import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { PaymentService } from './payment.service';
import { NotificationService } from '../notification/notification.service';
import { GroupModel } from '../groups/model/group.entity';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';

@Injectable()
export class PaymentCronService {
  private readonly logger = new Logger(PaymentCronService.name);

  constructor(
    private paymentService: PaymentService,
    private notificationService: NotificationService,
    @InjectModel(GroupModel) private groupModel: typeof GroupModel,
    @InjectModel(EducationCenterModel) private centerModel: typeof EducationCenterModel,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async autoGenerateAndRemind() {
    this.logger.log('Running payment auto-generation and reminders...');
    try {
      const genResult = await this.paymentService.autoGenerateMonthlyPayments();
      this.logger.log(`Auto-generated ${genResult.created} unpaid payments for ${genResult.month}/${genResult.year}`);
    } catch (err) {
      this.logger.error('Auto-generation failed:', err);
    }

    try {
      const centers = await this.centerModel.findAll({ attributes: ['id'] });
      let totalSent = 0;
      for (const center of centers) {
        try {
          const result = await this.notificationService.sendDailyPaymentReminders(center.id);
          totalSent += result.sent;
        } catch {}
      }
      // Also send reminders for global (no center_id)
      const globalResult = await this.notificationService.sendDailyPaymentReminders();
      totalSent += globalResult.sent;
      this.logger.log(`Sent ${totalSent} payment reminders with templates`);
    } catch (err) {
      this.logger.error('Payment reminders failed:', err);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2PM)
  async weeklyLessonReminder() {
    this.logger.log('Running lesson-based payment reminders...');
    try {
      const groups = await this.groupModel.findAll({
        where: { monthly_price: { [Op.gt]: 0 } },
      });
      let totalSent = 0;
      for (const group of groups) {
        try {
          const result = await this.paymentService.checkLessonReminders(group.id);
          totalSent += result.sent || 0;
        } catch {}
      }
      this.logger.log(`Sent ${totalSent} lesson-based reminders`);
    } catch (err) {
      this.logger.error('Lesson reminders failed:', err);
    }
  }
}
