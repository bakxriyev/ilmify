import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Op } from 'sequelize';
import { SmsLogModel } from './entities/sms-log.entity';
import { SmsTemplateModel } from './entities/sms-template.entity';
import { SmsStatus, SmsTemplate, SmsTemplateCategory, OtpEntry } from './interfaces/sms.interface';

const DEFAULT_TEMPLATES: SmsTemplate[] = [
  {
    id: 'payment_reminder',
    category: SmsTemplateCategory.PAYMENT_REMINDER,
    title: 'To\'lov eslatmasi',
    body: 'Hurmatli {studentName}! {groupName} guruhida {amount} so\'m to\'lovingiz {dueDate} gacha to\'lanishi kerak. Iltimos, o\'z vaqtida to\'lang. O\'quv markaz: {centerName}',
    variables: ['studentName', 'groupName', 'amount', 'dueDate', 'centerName'],
  },
  {
    id: 'lesson_start',
    category: SmsTemplateCategory.LESSON_START,
    title: 'Dars boshlanishi',
    body: 'Assalomu alaykum, {studentName}! Bugun soat {time} da {subject} darsi boshlanadi. Xona: {room}. O\'qituvchi: {teacherName}',
    variables: ['studentName', 'time', 'subject', 'room', 'teacherName'],
  },
  {
    id: 'group_acceptance',
    category: SmsTemplateCategory.GROUP_ACCEPTANCE,
    title: 'Guruhga qabul',
    body: 'Tabriklaymiz, {studentName}! Siz {groupName} guruhiga qabul qilindingiz. Darslar {startDate} dan boshlanadi. Batafsil: {phone}',
    variables: ['studentName', 'groupName', 'startDate', 'phone'],
  },
  {
    id: 'exam_result',
    category: SmsTemplateCategory.EXAM_RESULT,
    title: 'Imtihon natijasi',
    body: 'Hurmatli {studentName}! {subjectName} imtihonidan {score} ball oldingiz. Baho: {grade}. O\'quv markaz: {centerName}',
    variables: ['studentName', 'subjectName', 'score', 'grade', 'centerName'],
  },
  {
    id: 'attendance',
    category: SmsTemplateCategory.ATTENDANCE,
    title: 'Davomatga chaqiruv',
    body: 'Hurmatli {studentName}! Bugun {date} darsga kelmadingiz. Sababi noma\'lum. Iltimos, administrator bilan bog\'laning: {phone}',
    variables: ['studentName', 'date', 'phone'],
  },
  {
    id: 'general',
    category: SmsTemplateCategory.GENERAL,
    title: 'Yangilik',
    body: 'O\'quv markaz: {message}',
    variables: ['message'],
  },
];

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private eskizToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private otpStore = new Map<string, OtpEntry>();

  constructor(
    @InjectModel(SmsLogModel)
    private smsLogModel: typeof SmsLogModel,
    @InjectModel(SmsTemplateModel)
    private smsTemplateModel: typeof SmsTemplateModel,
    private configService: ConfigService,
  ) {}

  // ─── Token Management ────────────────────────────────────

  private get baseUrl(): string {
    return this.configService.get<string>('ESKIZ_BASE_URL', 'https://notify.eskiz.uz/api');
  }

  private get email(): string {
    return this.configService.get<string>('ESKIZ_EMAIL', '');
  }

  private get password(): string {
    return this.configService.get<string>('ESKIZ_PASSWORD', '');
  }

  private get defaultFrom(): string {
    return this.configService.get<string>('ESKIZ_FROM', '4546');
  }

  private get otpExpireMinutes(): number {
    return Number(this.configService.get<number>('SMS_OTP_EXPIRE_MINUTES', 5));
  }

  private get maxOtpAttempts(): number {
    return Number(this.configService.get<number>('SMS_MAX_OTP_ATTEMPTS', 3));
  }

  private async fetchEskiz(method: string, path: string, body?: any, retries = 3): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.eskizToken) {
      headers['Authorization'] = `Bearer ${this.eskizToken}`;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(15000),
        });

        if (res.status === 401) {
          this.logger.warn('Token expired, re-logging in...');
          await this.login();
          headers['Authorization'] = `Bearer ${this.eskizToken}`;
          const retryRes = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
          return retryRes.json();
        }

        if (res.status === 429) {
          const waitMs = Math.min(1000 * attempt, 5000);
          this.logger.warn(`Rate limited, waiting ${waitMs}ms (attempt ${attempt}/${retries})`);
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || `HTTP ${res.status}`);
        }
        return data;
      } catch (err: any) {
        if (attempt === retries) throw err;
        this.logger.warn(`Eskiz API error (attempt ${attempt}/${retries}): ${err.message}`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  async login(): Promise<string> {
    const data = await this.fetchEskiz('POST', '/auth/login', {
      email: this.email,
      password: this.password,
    }, 1);
    this.eskizToken = data.data?.token || data.token;
    this.tokenExpiry = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000);
    this.logger.log('Eskiz token refreshed');
    return this.eskizToken!;
  }

  async refreshToken(): Promise<string> {
    if (!this.eskizToken) return this.login();
    const data = await this.fetchEskiz('POST', '/auth/refresh', {}, 1);
    this.eskizToken = data.data?.token || data.token;
    this.tokenExpiry = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000);
    return this.eskizToken!;
  }

  async getToken(): Promise<string> {
    if (this.eskizToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.eskizToken;
    }
    return this.login();
  }

  async testConnection(email: string, password: string): Promise<boolean> {
    try {
      const data = await this.fetchEskiz('POST', '/auth/login', { email, password }, 1);
      return !!(data.data?.token || data.token);
    } catch {
      return false;
    }
  }

  // ─── SMS Send ────────────────────────────────────────────

  async sendSms(phone: string, message: string, from?: string, centerId?: number, createdBy?: number): Promise<SmsLogModel> {
    const cleanedPhone = phone.replace(/[^\d]/g, '');
    if (cleanedPhone.length < 10) {
      throw new HttpException('Noto\'g\'ri telefon raqam', HttpStatus.BAD_REQUEST);
    }

    const log = await this.smsLogModel.create({
      phone: cleanedPhone,
      message,
      status: SmsStatus.PENDING,
      center_id: centerId || null,
      created_by: createdBy || null,
    });

    try {
      const token = await this.getToken();
      const data = await this.fetchEskiz('POST', '/message/sms/send', {
        mobile_phone: cleanedPhone,
        message,
        from: from || this.defaultFrom,
      });

      const eskizId = data.data?.id || data.id || data.message_id;
      await log.update({
        status: SmsStatus.SENT,
        eskiz_message_id: eskizId || null,
        sent_at: new Date(),
        metadata: data,
      });

      this.logger.log(`SMS sent to ${cleanedPhone}: ${eskizId}`);
      return log;
    } catch (err: any) {
      await log.update({
        status: SmsStatus.FAILED,
        metadata: { error: err.message },
      });
      this.logger.error(`SMS failed to ${cleanedPhone}: ${err.message}`);
      return log;
    }
  }

  async sendBulkSms(
    messages: Array<{ phone: string; message: string; from?: string }>,
    centerId?: number,
    createdBy?: number,
  ): Promise<{ total: number; success: number; failed: number; logs: SmsLogModel[] }> {
    let success = 0;
    let failed = 0;
    const logs: SmsLogModel[] = [];

    for (const msg of messages) {
      try {
        const log = await this.sendSms(msg.phone, msg.message, msg.from, centerId, createdBy);
        logs.push(log);
        if (log.status === SmsStatus.SENT) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return { total: messages.length, success, failed, logs };
  }

  async getSmsStatus(eskizMessageId: string): Promise<any> {
    const data = await this.fetchEskiz('GET', `/message/sms/status/${eskizMessageId}`);
    return data;
  }

  async getReport(startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    const query = params.toString();
    return this.fetchEskiz('GET', `/user/reports/period${query ? `?${query}` : ''}`);
  }

  // ─── SMS Logs ────────────────────────────────────────────

  async getLogs(filters: { start_date?: string; end_date?: string; status?: string; center_id?: number; page?: number; limit?: number }) {
    const where: any = {};
    if (filters.center_id) where.center_id = filters.center_id;
    if (filters.status) where.status = filters.status;
    if (filters.start_date || filters.end_date) {
      where.created_at = {};
      if (filters.start_date) where.created_at[Op.gte] = new Date(filters.start_date);
      if (filters.end_date) where.created_at[Op.lte] = new Date(filters.end_date + 'T23:59:59');
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const { rows, count } = await this.smsLogModel.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return { data: rows, total: count, page, limit, total_pages: Math.ceil(count / limit) };
  }

  async getStats(centerId?: number) {
    const where: any = {};
    if (centerId) where.center_id = centerId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const total = await this.smsLogModel.count({ where });
    const todayCount = await this.smsLogModel.count({ where: { ...where, created_at: { [Op.gte]: today } } });
    const monthCount = await this.smsLogModel.count({ where: { ...where, created_at: { [Op.gte]: monthStart } } });
    const sent = await this.smsLogModel.count({ where: { ...where, status: SmsStatus.SENT } });
    const delivered = await this.smsLogModel.count({ where: { ...where, status: SmsStatus.DELIVERED } });
    const failed = await this.smsLogModel.count({ where: { ...where, status: SmsStatus.FAILED } });
    const pending = await this.smsLogModel.count({ where: { ...where, status: SmsStatus.PENDING } });

    return { total, today: todayCount, month: monthCount, sent, delivered, failed, pending };
  }

  // ─── Templates ───────────────────────────────────────────

  async getDefaultTemplates(): Promise<SmsTemplate[]> {
    return DEFAULT_TEMPLATES;
  }

  async getTemplates(centerId?: number): Promise<SmsTemplateModel[]> {
    const where: any = {};
    if (centerId) where.center_id = centerId;
    return this.smsTemplateModel.findAll({ where, order: [['created_at', 'DESC']] });
  }

  async createTemplate(data: { category: string; title: string; body: string; variables?: string[]; center_id?: number }): Promise<SmsTemplateModel> {
    return this.smsTemplateModel.create({
      category: data.category,
      title: data.title,
      body: data.body,
      variables: data.variables || [],
      center_id: data.center_id || null,
    });
  }

  async updateTemplate(id: number, data: Partial<{ category: string; title: string; body: string; variables?: string[] }>): Promise<SmsTemplateModel> {
    const tmpl = await this.smsTemplateModel.findByPk(id);
    if (!tmpl) throw new HttpException('Shablon topilmadi', HttpStatus.NOT_FOUND);
    await tmpl.update(data);
    return tmpl;
  }

  async deleteTemplate(id: number): Promise<void> {
    const tmpl = await this.smsTemplateModel.findByPk(id);
    if (!tmpl) throw new HttpException('Shablon topilmadi', HttpStatus.NOT_FOUND);
    await tmpl.destroy();
  }

  replaceTemplateVariables(body: string, variables: Record<string, string>): string {
    let result = body;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value || '');
    }
    return result;
  }

  // ─── OTP ─────────────────────────────────────────────────

  async sendOtp(phone: string, centerId?: number): Promise<{ success: boolean }> {
    const cleanedPhone = phone.replace(/[^\d]/g, '');
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    this.otpStore.set(cleanedPhone, {
      code,
      phone: cleanedPhone,
      expiresAt: new Date(Date.now() + this.otpExpireMinutes * 60 * 1000),
      attempts: 0,
      verified: false,
    });

    const message = `O'quv markazimizga xush kelibsiz! Tasdiqlash kodi: ${code}. ${this.otpExpireMinutes} daqiqa amal qiladi.`;
    await this.sendSms(cleanedPhone, message, undefined, centerId);
    return { success: true };
  }

  async verifyOtp(phone: string, code: string): Promise<{ verified: boolean; message: string }> {
    const cleanedPhone = phone.replace(/[^\d]/g, '');
    const entry = this.otpStore.get(cleanedPhone);

    if (!entry) {
      return { verified: false, message: 'OTP kodi topilmadi. Iltimos, qayta yuboring.' };
    }

    if (entry.verified) {
      return { verified: false, message: 'Bu kod allaqachon tasdiqlangan.' };
    }

    if (entry.expiresAt < new Date()) {
      this.otpStore.delete(cleanedPhone);
      return { verified: false, message: 'OTP kodi muddati tugagan. Qayta yuboring.' };
    }

    if (entry.attempts >= this.maxOtpAttempts) {
      this.otpStore.delete(cleanedPhone);
      return { verified: false, message: `3 marta noto\'g\'ri urinish. Iltimos, qayta yuboring.` };
    }

    if (entry.code !== code) {
      entry.attempts++;
      this.otpStore.set(cleanedPhone, entry);
      const remaining = this.maxOtpAttempts - entry.attempts;
      return { verified: false, message: `Noto\'g\'ri kod. ${remaining} ta urinish qoldi.` };
    }

    entry.verified = true;
    this.otpStore.set(cleanedPhone, entry);
    return { verified: true, message: 'Telefon raqam tasdiqlandi.' };
  }

  // ─── Cron Jobs ───────────────────────────────────────────

  @Cron(CronExpression.EVERY_30_MINUTES)
  async updatePendingStatuses() {
    const pending = await this.smsLogModel.findAll({
      where: { status: SmsStatus.PENDING, eskiz_message_id: { [Op.ne]: null } },
    });

    for (const log of pending) {
      try {
        const statusData = await this.getSmsStatus(log.eskiz_message_id!);
        const eskizStatus = statusData.data?.status || statusData.status;
        if (eskizStatus === 'delivered' || eskizStatus === 'sent') {
          await log.update({
            status: eskizStatus === 'delivered' ? SmsStatus.DELIVERED : SmsStatus.SENT,
            delivered_at: eskizStatus === 'delivered' ? new Date() : undefined,
          });
        } else if (eskizStatus === 'failed' || eskizStatus === 'error') {
          await log.update({ status: SmsStatus.FAILED });
        }
      } catch {
        // skip individual errors
      }
    }
  }

  @Cron('0 0 */25 * *')
  async scheduledTokenRefresh() {
    try {
      await this.refreshToken();
    } catch (err: any) {
      this.logger.error(`Token refresh failed: ${err.message}`);
    }
  }

  // Cleanup expired OTPs every hour
  @Cron(CronExpression.EVERY_HOUR)
  cleanupExpiredOtps() {
    const now = new Date();
    for (const [key, entry] of this.otpStore.entries()) {
      if (entry.expiresAt < now || entry.verified) {
        this.otpStore.delete(key);
      }
    }
  }

  // ─── Payment reminder cron ───────────────────────────────

  @Cron('0 9 * * *')
  async sendPaymentReminders() {
    // This can be extended when integrated with PaymentService
    this.logger.log('Daily 9AM payment reminder SMS cron fired (not yet integrated)');
  }
}
