import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TelegramSettingsModel } from './entities/telegram-settings.entity';
import { StudentModel } from '../students/model/student.entity';
import { PaymentModel } from '../payments/entities/payment.entity';
import { AttendanceModel } from '../attendence/model/attendence.entity';
import { GroupModel } from '../groups/model/group.entity';
import { ParentStudentModel } from '../parents/entities/parent-student.entity';
import { ParentModel } from '../parents/entities/parent.entity';
import { Op } from 'sequelize';

@Injectable()
export class TelegramService {
  constructor(
    @InjectModel(TelegramSettingsModel)
    private settingsModel: typeof TelegramSettingsModel,
    @InjectModel(StudentModel)
    private studentModel: typeof StudentModel,
    @InjectModel(PaymentModel)
    private paymentModel: typeof PaymentModel,
    @InjectModel(AttendanceModel)
    private attendanceModel: typeof AttendanceModel,
    @InjectModel(ParentStudentModel)
    private parentStudentModel: typeof ParentStudentModel,
    @InjectModel(ParentModel)
    private parentModel: typeof ParentModel,
  ) {}

  async getSettings(): Promise<TelegramSettingsModel> {
    let settings = await this.settingsModel.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = await this.settingsModel.create({ id: 1, bot_token: '', channel_usernames: '' });
    }
    return settings;
  }

  async updateSettings(data: { bot_token?: string; channel_usernames?: string; is_active?: boolean }): Promise<TelegramSettingsModel> {
    let settings = await this.settingsModel.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = await this.settingsModel.create({ id: 1, bot_token: '', channel_usernames: '' });
    }
    if (data.bot_token !== undefined) settings.bot_token = data.bot_token;
    if (data.channel_usernames !== undefined) settings.channel_usernames = data.channel_usernames;
    if (data.is_active !== undefined) settings.is_active = data.is_active;
    await settings.save();
    return settings;
  }

  async getBotConfig(): Promise<{ bot_token: string; channel_usernames: string[] }> {
    const settings = await this.getSettings();
    const channels = (settings.channel_usernames || '')
      .split(',')
      .map(c => c.trim().replace('@', ''))
      .filter(Boolean);
    return { bot_token: settings.bot_token, channel_usernames: channels };
  }

  async authByPhone(phone_number: string): Promise<{ exists: boolean; student?: any }> {
    const student = await this.studentModel.findOne({
      where: { phone_number },
      attributes: ['id', 'first_name', 'last_name', 'phone_number'],
    });
    if (!student) return { exists: false };
    return { exists: true, student };
  }

  async verifyPassword(phone_number: string, password: string): Promise<{ success: boolean; student?: any }> {
    const student = await this.studentModel.findOne({
      where: { phone_number, password },
      attributes: ['id', 'first_name', 'last_name', 'phone_number', 'email', 'age', 'isActive', 'center_id'],
      include: [{ model: GroupModel, attributes: ['id', 'name', 'description', 'isActive'], required: false }],
    });
    if (!student) return { success: false };
    return { success: true, student };
  }

  async getStudentProfile(studentId: number): Promise<any> {
    const student = await this.studentModel.findOne({
      where: { id: studentId },
      attributes: ['id', 'first_name', 'last_name', 'phone_number', 'email', 'age', 'isActive', 'created_at'],
      include: [{ model: GroupModel, attributes: ['id', 'name', 'description', 'isActive'], required: false }],
    });
    if (!student) throw new NotFoundException('Student topilmadi');
    return student;
  }

  async getStudentPayments(studentId: number, limit: number = 20): Promise<any[]> {
    const payments = await this.paymentModel.findAll({
      where: { student_id: studentId },
      order: [['year', 'DESC'], ['month', 'DESC']],
      limit,
      attributes: ['id', 'amount', 'month', 'year', 'status', 'paid_at', 'note'],
    });
    return payments;
  }

  async getStudentAttendance(studentId: number, limit: number = 20): Promise<any[]> {
    const records = await this.attendanceModel.findAll({
      where: { student_id: studentId },
      order: [['date', 'DESC']],
      limit,
      attributes: ['id', 'date', 'is_present', 'reason'],
      include: [{ model: GroupModel, attributes: ['id', 'name'] }],
    });
    return records;
  }

  async getStudentParents(studentId: number): Promise<any[]> {
    const links = await this.parentStudentModel.findAll({
      where: { student_id: studentId },
      include: [{ model: ParentModel, attributes: ['id', 'first_name', 'last_name', 'phone_number'] }],
    });
    return links.map(l => l.parent).filter(Boolean);
  }
}
