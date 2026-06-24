import { Injectable, Logger, HttpException, HttpStatus, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Op } from 'sequelize';
import { SmsLogModel } from './entities/sms-log.entity';
import { SmsTemplateModel } from './entities/sms-template.entity';
import { SmsStatus, SmsTemplate, SmsTemplateCategory, RecipientType, OtpEntry } from './interfaces/sms.interface';
import { AuditService } from '../audit/audit.service';
import { StudentModel } from '../students/model/student.entity';
import { TeacherModel } from '../teachers/model/teacher.model';
import { GroupModel } from '../groups/model/group.entity';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';

// Eskizda tasdiqlangan shablonlar
const DEFAULT_TEMPLATES: SmsTemplate[] = [
  {
    id: 'login_credentials',
    category: SmsTemplateCategory.LOGIN_CREDENTIALS,
    title: 'Kirish ma\'lumotlari',
    body: 'Hurmatli {ism} {familiya}! {markaz} tizimiga kirish ma\'lumotlarinigz: Raqamingiz: {login} Parolingiz: {password} {bot}',
    variables: ['ism', 'familiya', 'markaz', 'login', 'password', 'bot'],
  },
  {
    id: 'debt_reminder',
    category: SmsTemplateCategory.DEBT_REMINDER,
    title: 'Qarzdorlik eslatmasi',
    body: 'Hurmatli {ism} {familiya}! {markaz} o\'quv markazi uchun {oy} oyi bo\'yicha {summa} so\'m qarzdorligingiz mavjud. To\'lovni o\'z vaqtida amalga oshiring.',
    variables: ['ism', 'familiya', 'markaz', 'oy', 'summa'],
  },
  {
    id: 'payment_reminder',
    category: SmsTemplateCategory.PAYMENT_REMINDER,
    title: 'To\'lov eslatmasi',
    body: 'Hurmatli {ism} {familiya}! {markaz} o\'quv markazi uchun {oy} oyi bo\'yicha {summa} so\'m qarzdorligingiz mavjud. To\'lovni o\'z vaqtida amalga oshiring.',
    variables: ['ism', 'familiya', 'markaz', 'oy', 'summa'],
  },
  {
    id: 'general',
    category: SmsTemplateCategory.GENERAL,
    title: 'Yangilik',
    body: 'Hurmatli {ism} {familiya}! {message}',
    variables: ['ism', 'familiya', 'message'],
  },
];

@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private eskizToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private otpStore = new Map<string, OtpEntry>();

  constructor(
    @InjectModel(SmsLogModel)
    private smsLogModel: typeof SmsLogModel,
    @InjectModel(SmsTemplateModel)
    private smsTemplateModel: typeof SmsTemplateModel,
    @InjectModel(StudentModel)
    private studentModel: typeof StudentModel,
    @InjectModel(TeacherModel)
    private teacherModel: typeof TeacherModel,
    @InjectModel(GroupModel)
    private groupModel: typeof GroupModel,
    @InjectModel(EducationCenterModel)
    private educationCenterModel: typeof EducationCenterModel,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  async onModuleInit() {
    // Template registration is available via POST /sms/templates/register-eskiz
    // Register templates manually on my.eskiz.uz -> SMS -> Мои тексты
    this.logger.log('SmsService initialized');
  }

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

  // ─── Eskiz Template Registration ─────────────────────────

  async registerEskizTemplate(templateText: string): Promise<any> {
    try {
      const res = await this.fetchEskiz('POST', '/user/template', { template: templateText });
      this.logger.log(`Eskiz template registered: "${templateText.substring(0, 40)}..."`);
      return res;
    } catch (err: any) {
      this.logger.warn(`Eskiz template register failed for "${templateText.substring(0, 30)}...": ${err.message}`);
      throw err;
    }
  }

  async registerDefaultTemplatesWithEskiz(): Promise<{ success: string[]; failed: { text: string; error: string }[] }> {
    const result: { success: string[]; failed: { text: string; error: string }[] } = { success: [], failed: [] };
    for (const tmpl of DEFAULT_TEMPLATES) {
      try {
        await this.registerEskizTemplate(tmpl.body);
        result.success.push(tmpl.id);
      } catch (err: any) {
        result.failed.push({ text: tmpl.id, error: err.message });
      }
    }
    return result;
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

  async resolveTemplate(templateOrMessage: string, variables: Record<string, string>): Promise<string> {
    const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.id === templateOrMessage || t.category === templateOrMessage);
    if (defaultTemplate) {
      return this.replaceTemplateVariables(defaultTemplate.body, variables);
    }
    const customTemplate = await this.smsTemplateModel.findOne({
      where: {
        [Op.or]: [
          { category: templateOrMessage },
          { title: templateOrMessage },
        ],
      },
    });
    if (customTemplate) {
      return this.replaceTemplateVariables(customTemplate.body, variables);
    }
    return this.replaceTemplateVariables(templateOrMessage, variables);
  }

  async getCenterName(centerId?: number): Promise<string> {
    if (!centerId) return '';
    const center = await this.educationCenterModel.findByPk(centerId, { attributes: ['name'] });
    return center ? center.name.trim() : '';
  }

  getMonthNameUzbek(month: number): string {
    const months = ['', 'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    return months[month] || '';
  }

  private buildSmsVariables(extraVars: Record<string, string> | undefined, centerName: string, monthUzb: string, student?: any): Record<string, string> {
    const base: Record<string, string> = {
      markaz: centerName,
      oy: extraVars?.oy || monthUzb,
      summa: '0',
      password: '',
      bot: extraVars?.bot || '',
      guruh: '',
    };
    if (extraVars) {
      for (const key of Object.keys(extraVars)) {
        if (key === 'summa') {
          base.summa = String(extraVars.summa).replace(/\s+/g, '');
        } else {
          base[key] = extraVars[key];
        }
      }
    }
    return base;
  }

  // ─── Get Center Info ──────────────────────────────────────

  async getCenterInfo(centerId: number) {
    const center = await this.educationCenterModel.findByPk(centerId, { attributes: ['id', 'name'] });
    if (!center) throw new HttpException('Markaz topilmadi', HttpStatus.NOT_FOUND);
    return { id: center.id, name: center.name };
  }

  // ─── Search Students for SMS Selection ────────────────────

  async searchStudents(search?: string, page = 1, limit = 20, centerId?: number) {
    const where: any = { isActive: true };
    if (centerId) where.center_id = centerId;
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { phone_number: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const offset = (page - 1) * limit;
    const { rows, count } = await this.studentModel.findAndCountAll({
      where,
      attributes: ['id', 'first_name', 'last_name', 'phone_number', 'group_id'],
      limit,
      offset,
      order: [['first_name', 'ASC']],
    });
    return {
      data: rows.map(s => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        phone_number: s.phone_number,
        group_id: s.group_id,
      })),
      total: count,
      page,
      limit,
      total_pages: Math.ceil(count / limit),
    };
  }

  // ─── Search Teachers for SMS Selection ────────────────────

  async searchTeachers(search?: string, page = 1, limit = 20, centerId?: number) {
    const where: any = {};
    if (centerId) where.center_id = centerId;
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { phone_number: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const offset = (page - 1) * limit;
    const { rows, count } = await this.teacherModel.findAndCountAll({
      where,
      attributes: ['id', 'first_name', 'last_name', 'phone_number'],
      limit,
      offset,
      order: [['first_name', 'ASC']],
    });
    return {
      data: rows.map(t => ({
        id: t.id,
        first_name: t.first_name,
        last_name: t.last_name,
        phone_number: t.phone_number,
      })),
      total: count,
      page,
      limit,
      total_pages: Math.ceil(count / limit),
    };
  }

  // ─── List Groups for SMS Selection ────────────────────────

  async listGroups(search?: string, centerId?: number) {
    const where: any = {};
    if (centerId) where.center_id = centerId;
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }
    const groups = await this.groupModel.findAll({
      where,
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });
    return groups.map(g => ({ id: g.id, name: g.name }));
  }

  // ─── Send to Student ──────────────────────────────────────

  async sendToStudent(
    studentId: number,
    templateOrMessage: string,
    extraVars?: Record<string, string>,
    centerId?: number,
    createdBy?: number,
  ): Promise<SmsLogModel> {
    const student = await this.studentModel.findByPk(studentId, {
      include: [{ model: EducationCenterModel }],
    });
    if (!student) throw new HttpException('Student topilmadi', HttpStatus.NOT_FOUND);
    if (!student.phone_number) throw new HttpException('Student telefon raqami topilmadi', HttpStatus.BAD_REQUEST);

    const centerName = await this.getCenterName(centerId || student.center_id);
    const now = new Date();
    const monthUzb = this.getMonthNameUzbek(now.getMonth() + 1);

    const variables: Record<string, string> = this.buildSmsVariables(extraVars, centerName, monthUzb, student);
    variables.ism = student.first_name || '';
    variables.familiya = student.last_name || '';
    variables.login = student.phone_number || '';

    const message = await this.resolveTemplate(templateOrMessage, variables);
    const log = await this.sendSms(student.phone_number, message, undefined, centerId || student.center_id, createdBy);
    await log.update({
      recipient_type: RecipientType.SINGLE_STUDENT,
      recipient_id: student.id,
      recipient_name: `${student.first_name} ${student.last_name}`,
      template_category: typeof templateOrMessage === 'string' && templateOrMessage.includes('{') ? undefined : templateOrMessage,
    });
    return log;
  }

  // ─── Send to All Students ─────────────────────────────────

  async sendToAllStudents(
    templateOrMessage: string,
    extraVars?: Record<string, string>,
    centerId?: number,
    createdBy?: number,
  ): Promise<{ total: number; success: number; failed: number; logs: SmsLogModel[] }> {
    const where: any = { isActive: true };
    if (centerId) where.center_id = centerId;

    const students = await this.studentModel.findAll({
      where,
      include: [{ model: EducationCenterModel }],
    });

    const studentsWithPhone = students.filter(s => s.phone_number);
    const centerName = await this.getCenterName(centerId);
    const now = new Date();
    const monthUzb = this.getMonthNameUzbek(now.getMonth() + 1);
    let success = 0;
    let failed = 0;
    const logs: SmsLogModel[] = [];

    for (const student of studentsWithPhone) {
      try {
        const variables: Record<string, string> = this.buildSmsVariables(extraVars, centerName, monthUzb, student);
        variables.ism = student.first_name || '';
        variables.familiya = student.last_name || '';
        variables.login = student.phone_number || '';

        const message = await this.resolveTemplate(templateOrMessage, variables);
        const log = await this.sendSms(student.phone_number, message, undefined, centerId || student.center_id, createdBy);
        await log.update({
          recipient_type: RecipientType.ALL_STUDENTS,
          recipient_id: student.id,
          recipient_name: `${student.first_name} ${student.last_name}`,
          template_category: typeof templateOrMessage === 'string' && templateOrMessage.includes('{') ? undefined : templateOrMessage,
        });
        logs.push(log);
        if (log.status === SmsStatus.SENT) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return { total: studentsWithPhone.length, success, failed, logs };
  }

  // ─── Send to Teacher ──────────────────────────────────────

  async sendToTeacher(
    teacherId: number,
    message: string,
    centerId?: number,
    createdBy?: number,
  ): Promise<SmsLogModel> {
    const teacher = await this.teacherModel.findByPk(teacherId);
    if (!teacher) throw new HttpException("O'qituvchi topilmadi", HttpStatus.NOT_FOUND);
    if (!teacher.phone_number) throw new HttpException("O'qituvchi telefon raqami topilmadi", HttpStatus.BAD_REQUEST);

    const log = await this.sendSms(teacher.phone_number, message, undefined, centerId || teacher.center_id, createdBy);
    await log.update({
      recipient_type: RecipientType.SINGLE_TEACHER,
      recipient_id: teacher.id,
      recipient_name: `${teacher.first_name} ${teacher.last_name}`,
    });
    return log;
  }

  // ─── Send to All Teachers ─────────────────────────────────

  async sendToAllTeachers(
    message: string,
    centerId?: number,
    createdBy?: number,
  ): Promise<{ total: number; success: number; failed: number; logs: SmsLogModel[] }> {
    const where: any = {};
    if (centerId) where.center_id = centerId;

    const teachers = await this.teacherModel.findAll({ where });
    const teachersWithPhone = teachers.filter(t => t.phone_number);
    let success = 0;
    let failed = 0;
    const logs: SmsLogModel[] = [];

    for (const teacher of teachersWithPhone) {
      try {
        const log = await this.sendSms(teacher.phone_number, message, undefined, centerId || teacher.center_id, createdBy);
        await log.update({
          recipient_type: RecipientType.ALL_TEACHERS,
          recipient_id: teacher.id,
          recipient_name: `${teacher.first_name} ${teacher.last_name}`,
        });
        logs.push(log);
        if (log.status === SmsStatus.SENT) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return { total: teachersWithPhone.length, success, failed, logs };
  }

  // ─── Send to Group Students ───────────────────────────────

  async sendToGroupStudents(
    groupId: number,
    templateOrMessage: string,
    extraVars?: Record<string, string>,
    centerId?: number,
    createdBy?: number,
  ): Promise<{ total: number; success: number; failed: number; logs: SmsLogModel[] }> {
    const group = await this.groupModel.findByPk(groupId);
    if (!group) throw new HttpException('Guruh topilmadi', HttpStatus.NOT_FOUND);

    const students = await this.studentModel.findAll({
      where: { group_id: groupId, isActive: true },
      include: [{ model: EducationCenterModel }],
    });

    const studentsWithPhone = students.filter(s => s.phone_number);
    const centerName = await this.getCenterName(centerId || group.center_id);
    const now = new Date();
    const monthUzb = this.getMonthNameUzbek(now.getMonth() + 1);
    let success = 0;
    let failed = 0;
    const logs: SmsLogModel[] = [];

    for (const student of studentsWithPhone) {
      try {
        const variables: Record<string, string> = this.buildSmsVariables(extraVars, centerName, monthUzb, student);
        variables.ism = student.first_name || '';
        variables.familiya = student.last_name || '';
        variables.login = student.phone_number || '';
        variables.guruh = group.name;

        const message = await this.resolveTemplate(templateOrMessage, variables);
        const log = await this.sendSms(student.phone_number, message, undefined, centerId || student.center_id, createdBy);
        await log.update({
          recipient_type: RecipientType.GROUP_STUDENTS,
          recipient_id: student.id,
          recipient_name: `${student.first_name} ${student.last_name}`,
          template_category: typeof templateOrMessage === 'string' && templateOrMessage.includes('{') ? undefined : templateOrMessage,
        });
        logs.push(log);
        if (log.status === SmsStatus.SENT) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return { total: studentsWithPhone.length, success, failed, logs };
  }

  // ─── Send to Selected Students ────────────────────────────

  async sendToSelectedStudents(
    studentIds: number[],
    templateOrMessage: string,
    extraVars?: Record<string, string>,
    centerId?: number,
    createdBy?: number,
  ): Promise<{ total: number; success: number; failed: number; logs: SmsLogModel[] }> {
    const students = await this.studentModel.findAll({
      where: { id: studentIds, isActive: true },
      include: [{ model: EducationCenterModel }],
    });

    const studentsWithPhone = students.filter(s => s.phone_number);
    const centerName = await this.getCenterName(centerId);
    const now = new Date();
    const monthUzb = this.getMonthNameUzbek(now.getMonth() + 1);
    let success = 0;
    let failed = 0;
    const logs: SmsLogModel[] = [];

    for (const student of studentsWithPhone) {
      try {
        const variables: Record<string, string> = this.buildSmsVariables(extraVars, centerName, monthUzb, student);
        variables.ism = student.first_name || '';
        variables.familiya = student.last_name || '';
        variables.login = student.phone_number || '';

        const message = await this.resolveTemplate(templateOrMessage, variables);
        const log = await this.sendSms(student.phone_number, message, undefined, centerId || student.center_id, createdBy);
        await log.update({
          recipient_type: RecipientType.SELECTED_STUDENTS,
          recipient_id: student.id,
          recipient_name: `${student.first_name} ${student.last_name}`,
          template_category: typeof templateOrMessage === 'string' && templateOrMessage.includes('{') ? undefined : templateOrMessage,
        });
        logs.push(log);
        if (log.status === SmsStatus.SENT) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return { total: studentsWithPhone.length, success, failed, logs };
  }

  // ─── Send Credentials (Forgot Password) ────────────────────

  async sendCredentials(
    studentId: number,
    botLink?: string,
    centerId?: number,
    createdBy?: number,
  ): Promise<SmsLogModel> {
    const student = await this.studentModel.findByPk(studentId, {
      include: [{ model: EducationCenterModel }],
    });
    if (!student) throw new HttpException('Student topilmadi', HttpStatus.NOT_FOUND);
    if (!student.phone_number) throw new HttpException('Student telefon raqami topilmadi', HttpStatus.BAD_REQUEST);

    const centerName = await this.getCenterName(centerId || student.center_id);
    const variables: Record<string, string> = {
      ism: student.first_name || '',
      familiya: student.last_name || '',
      markaz: centerName,
      login: student.phone_number || '',
      password: student.password || '',
      bot: botLink || '',
    };

    const message = await this.resolveTemplate('login_credentials', variables);
    const log = await this.sendSms(student.phone_number, message, undefined, centerId || student.center_id, createdBy);
    await log.update({
      recipient_type: RecipientType.SINGLE_STUDENT,
      recipient_id: student.id,
      recipient_name: `${student.first_name} ${student.last_name}`,
      template_category: 'login_credentials',
    });
    return log;
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

    let updated = 0;
    for (const log of pending) {
      try {
        const statusData = await this.getSmsStatus(log.eskiz_message_id!);
        const eskizStatus = statusData.data?.status || statusData.status;
        if (eskizStatus === 'delivered' || eskizStatus === 'sent') {
          await log.update({
            status: eskizStatus === 'delivered' ? SmsStatus.DELIVERED : SmsStatus.SENT,
            delivered_at: eskizStatus === 'delivered' ? new Date() : undefined,
          });
          updated++;
        } else if (eskizStatus === 'failed' || eskizStatus === 'error') {
          await log.update({ status: SmsStatus.FAILED });
          updated++;
        }
      } catch {
        // skip individual errors
      }
    }

    if (updated > 0) {
      this.auditService.log({
        action: 'auto_update',
        entity_type: 'sms',
        entity_id: '',
        entity_name: '',
        description: `${updated} ta SMS holati yangilandi (${pending.length} tekshirildi)`,
        admin_id: 0,
        admin_name: 'Cron',
      });
    }
  }

  @Cron('0 0 */25 * *')
  async scheduledTokenRefresh() {
    try {
      await this.refreshToken();
      this.logger.log('Eskiz token refreshed successfully');
      this.auditService.log({
        action: 'auto_refresh',
        entity_type: 'sms',
        entity_id: '',
        entity_name: '',
        description: 'Eskiz token muvaffaqiyatli yangilandi',
        admin_id: 0,
        admin_name: 'Cron',
      });
    } catch (err: any) {
      this.logger.error(`Token refresh failed: ${err.message}`);
      this.auditService.log({
        action: 'auto_refresh',
        entity_type: 'sms',
        entity_id: '',
        entity_name: '',
        description: `Eskiz token yangilashda xatolik: ${err.message}`,
        admin_id: 0,
        admin_name: 'Cron',
      });
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


  @Cron('0 9 * * *')
  async sendPaymentReminders() {
    
    this.logger.log('Daily 9AM payment reminder SMS cron fired (not yet integrated)');
  }
}
