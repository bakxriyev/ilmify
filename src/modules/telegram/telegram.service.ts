import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TelegramSettingsModel } from './entities/telegram-settings.entity';
import { StudentModel } from '../students/model/student.entity';
import { PaymentModel } from '../payments/entities/payment.entity';
import { AttendanceModel } from '../attendence/model/attendence.entity';
import { GroupModel } from '../groups/model/group.entity';
import { GroupStudentModel } from '../group_student_model';
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
    @InjectModel(GroupStudentModel)
    private groupStudentModel: typeof GroupStudentModel,
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
      include: [
        { model: GroupModel, attributes: ['id', 'name'], required: false },
        { model: GroupStudentModel, as: 'group_students', required: false, include: [{ model: GroupModel, as: 'group', attributes: ['id', 'name'] }] },
      ],
    });
    if (!student) return { success: false };

    const json = student.toJSON();
    if (!json.group && json.group_students && json.group_students.length > 0) {
      json.group = json.group_students[0].group;
    }
    delete json.group_students;
    return { success: true, student: json };
  }

  async getStudentProfile(studentId: number): Promise<any> {
    const student = await this.studentModel.findOne({
      where: { id: studentId },
      attributes: ['id', 'first_name', 'last_name', 'phone_number', 'email', 'age', 'isActive'],
      include: [
        { model: GroupModel, attributes: ['id', 'name'], required: false },
        { model: GroupStudentModel, as: 'group_students', required: false, include: [{ model: GroupModel, as: 'group', attributes: ['id', 'name'] }] },
      ],
    });
    if (!student) throw new NotFoundException('Student topilmadi');

    const json = student.toJSON();
    if (!json.group && json.group_students && json.group_students.length > 0) {
      json.group = json.group_students[0].group;
    }
    delete json.group_students;
    return json;
  }

  async getStudentPayments(studentId: number, limit: number = 20): Promise<any[]> {
    const payments = await this.paymentModel.findAll({
      where: { student_id: studentId },
      order: [['year', 'DESC'], ['month', 'DESC']],
      limit,
      attributes: ['id', 'amount', 'month', 'year', 'status', 'paid_at', 'note'],
    });
    return payments.map(p => ({
      ...p.toJSON(),
      amount: Number(p.amount),
    }));
  }

  async getStudentAttendance(studentId: number, limit: number = 20): Promise<any[]> {
    const records = await this.attendanceModel.findAll({
      where: { student_id: studentId },
      order: [['date', 'DESC']],
      limit,
      attributes: ['id', 'date', 'is_present', 'reason'],
      include: [{ model: GroupModel, attributes: ['id', 'name'], required: false }],
    });
    return records;
  }

  async getStudentParents(studentId: number): Promise<any[]> {
    const links = await this.parentStudentModel.findAll({
      where: { student_id: studentId },
      include: [{ model: ParentModel, as: 'parent', attributes: ['id', 'first_name', 'last_name', 'phone_number'] }],
    });
    const parents = links.map(l => l.parent).filter(Boolean);
    return parents;
  }
}
