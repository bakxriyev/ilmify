import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { PaymentModel, PaymentStatus } from './entities/payment.entity';
import { StudentModel } from '../students/model/student.entity';
import { GroupModel } from '../groups/model/group.entity';
import { GroupStudentModel } from '../group_student_model';
import { GroupLessonModel } from '../group-lesson/entities/group-lesson.entity';
import { ParentStudentModel } from '../parents/entities/parent-student.entity';
import { ParentModel } from '../parents/entities/parent.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(PaymentModel) private paymentModel: typeof PaymentModel,
    @InjectModel(StudentModel) private studentModel: typeof StudentModel,
    @InjectModel(GroupModel) private groupModel: typeof GroupModel,
    @InjectModel(GroupStudentModel) private groupStudentModel: typeof GroupStudentModel,
    @InjectModel(ParentStudentModel) private parentStudentModel: typeof ParentStudentModel,
    @InjectModel(ParentModel) private parentModel: typeof ParentModel,
    private notificationService: NotificationService,
  ) {}

  async create(dto: CreatePaymentDto) {
    const student = await this.studentModel.findByPk(dto.student_id);
    if (!student) throw new NotFoundException('Student topilmadi');
    const group = await this.groupModel.findByPk(dto.group_id);
    if (!group) throw new NotFoundException('Guruh topilmadi');

    const existing = await this.paymentModel.findOne({
      where: { student_id: dto.student_id, month: dto.month, year: dto.year },
    });
    if (existing) throw new BadRequestException('Bu oy uchun to\'lov allaqachon yaratilgan');

    const payment = await this.paymentModel.create({
      student_id: dto.student_id,
      group_id: dto.group_id,
      amount: dto.amount,
      month: dto.month,
      year: dto.year,
      status: dto.status || PaymentStatus.PAID,
      paid_at: dto.status === PaymentStatus.PAID ? new Date().toISOString().split('T')[0] : null,
      note: dto.note || null,
      center_id: (dto as any).center_id || null,
    });

    return this.paymentModel.findByPk(payment.id, {
      include: [
        { model: StudentModel, attributes: ['id', 'first_name', 'last_name', 'phone_number'] },
        { model: GroupModel, attributes: ['id', 'name', 'monthly_price'] },
      ],
    });
  }

  async findAll(group_id?: number, student_id?: number, month?: number, year?: number, status?: string, center_id?: number) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    if (group_id) where.group_id = group_id;
    if (student_id) where.student_id = student_id;
    if (month) where.month = month;
    if (year) where.year = year;
    if (status) where.status = status;

    return this.paymentModel.findAll({
      where,
      include: [
        { model: StudentModel, attributes: ['id', 'first_name', 'last_name', 'phone_number'] },
        { model: GroupModel, attributes: ['id', 'name', 'monthly_price'] },
      ],
      order: [['year', 'DESC'], ['month', 'DESC'], ['created_at', 'DESC']],
    });
  }

  async findByStudent(studentId: number) {
    return this.paymentModel.findAll({
      where: { student_id: studentId },
      include: [{ model: GroupModel, attributes: ['id', 'name', 'monthly_price'] }],
      order: [['year', 'DESC'], ['month', 'DESC']],
    });
  }

  async getStudentsOverview(month: number, year: number) {
    const now = new Date();
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
    const overdueDays = Math.max(0, Math.floor((now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));

    const relationWhere: any = {};
    if (isCurrentMonth) {
      relationWhere.left_date = null;
    } else {
      const groupsWithLessons = await GroupLessonModel.findAll({
        where: {
          date: { [Op.gte]: monthStart, [Op.lte]: monthEnd },
        },
        attributes: ['group_id'],
      });
      const groupIdsWithLessons = [...new Set(groupsWithLessons.map(g => Number(g.group_id)))];
      if (groupIdsWithLessons.length === 0) return [];

      relationWhere.group_id = { [Op.in]: groupIdsWithLessons };
      relationWhere.joined_date = { [Op.lte]: monthEnd };
      relationWhere[Op.or] = [
        { left_date: null },
        { left_date: { [Op.gte]: monthStart } },
      ];
    }

    const relations = await this.groupStudentModel.findAll({
      where: relationWhere,
      include: [
        { model: StudentModel, as: 'student', attributes: ['id', 'first_name', 'last_name', 'phone_number'] },
        { model: GroupModel, as: 'group', attributes: ['id', 'name', 'monthly_price'] },
      ],
    });

    const payments = await this.paymentModel.findAll({
      where: { month, year },
    });

    return relations.map(rel => {
      const relJson = rel.toJSON() as any;
      const student = relJson.student;
      const group = relJson.group;
      if (!student || !group) return null;

      const payment = payments.find(p => Number(p.student_id) === Number(student.id) && Number(p.group_id) === Number(group.id));
      const status = payment?.status || PaymentStatus.UNPAID;
      const monthlyPrice = Number(group.monthly_price) || 0;
      const paidAmount = status === PaymentStatus.UNPAID ? 0 : (payment?.amount || 0);
      const debt = status === PaymentStatus.PAID ? 0 : (monthlyPrice - paidAmount);

      return {
        student: { id: Number(student.id), first_name: student.first_name, last_name: student.last_name, phone_number: student.phone_number },
        group: { id: Number(group.id), name: group.name, monthly_price: monthlyPrice },
        payment: payment || null,
        status,
        month,
        year,
        monthly_price: monthlyPrice,
        paid_amount: paidAmount,
        debt: Math.max(0, debt),
        overdue_days: status === PaymentStatus.PAID ? 0 : overdueDays,
      };
    }).filter(Boolean);
  }

  async findByGroup(groupId: number, month?: number, year?: number) {
    const group = await this.groupModel.findByPk(groupId, {
      attributes: ['id', 'name', 'monthly_price'],
    });
    const monthlyPrice = group?.monthly_price || 0;

    const where: any = { group_id: groupId };
    if (month) where.month = month;
    if (year) where.year = year;

    const groupStudents = await this.groupStudentModel.findAll({
      where: { group_id: groupId },
    });

    const studentIds = groupStudents.map(gs => gs.student_id);
    const students = await this.studentModel.findAll({
      where: { id: studentIds },
      attributes: ['id', 'first_name', 'last_name', 'phone_number'],
    });

    const payments = await this.paymentModel.findAll({
      where,
      include: [{ model: StudentModel, attributes: ['id'] }],
    });

    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();
    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const overdueDays = Math.max(0, Math.floor((now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));

    return students.map(s => {
      const payment = payments.find(p => Number(p.student_id) === Number(s.id));
      const status = payment?.status || PaymentStatus.UNPAID;
      const paidAmount = payment?.amount && status === PaymentStatus.PAID ? payment.amount : (payment?.amount && status === PaymentStatus.PARTIAL ? payment.amount : 0);
      const debt = status === PaymentStatus.PAID ? 0 : (monthlyPrice - paidAmount);

      return {
        student: { id: s.id, first_name: s.first_name, last_name: s.last_name, phone_number: s.phone_number },
        payment: payment || null,
        status,
        month: targetMonth,
        year: targetYear,
        monthly_price: monthlyPrice,
        paid_amount: paidAmount,
        debt: Math.max(0, debt),
        overdue_days: status === PaymentStatus.PAID ? 0 : overdueDays,
      };
    });
  }

  async update(id: number, dto: UpdatePaymentDto) {
    const payment = await this.paymentModel.findByPk(id);
    if (!payment) throw new NotFoundException('To\'lov topilmadi');
    if (dto.status === PaymentStatus.PAID && !dto.paid_at) {
      dto.paid_at = new Date().toISOString().split('T')[0];
    }
    await payment.update(dto);
    return this.paymentModel.findByPk(id, {
      include: [
        { model: StudentModel, attributes: ['id', 'first_name', 'last_name'] },
        { model: GroupModel, attributes: ['id', 'name'] },
      ],
    });
  }

  async remove(id: number) {
    const payment = await this.paymentModel.findByPk(id);
    if (!payment) throw new NotFoundException('To\'lov topilmadi');
    await payment.destroy();
    return { message: 'To\'lov o\'chirildi' };
  }

  async getStats() {
    const totalPayments = await this.paymentModel.count();
    const paidCount = await this.paymentModel.count({ where: { status: PaymentStatus.PAID } });
    const unpaidCount = await this.paymentModel.count({ where: { status: PaymentStatus.UNPAID } });
    const partialCount = await this.paymentModel.count({ where: { status: PaymentStatus.PARTIAL } });
    const totalAmount = await this.paymentModel.sum('amount', { where: { status: PaymentStatus.PAID } });
    return { total: totalPayments, paid: paidCount, unpaid: unpaidCount, partial: partialCount, total_amount: totalAmount || 0 };
  }

  async autoGenerateMonthlyPayments() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const groups = await this.groupModel.findAll({ where: { monthly_price: { [Op.gt]: 0 } } });
    let created = 0;
    for (const group of groups) {
      const relations = await this.groupStudentModel.findAll({ where: { group_id: group.id } });
      for (const rel of relations) {
        const exists = await this.paymentModel.findOne({ where: { student_id: rel.student_id, month, year } });
        if (!exists) {
          await this.paymentModel.create({ student_id: rel.student_id, group_id: group.id, amount: group.monthly_price, month, year, status: PaymentStatus.UNPAID });
          created++;
        }
      }
    }
    return { created, month, year };
  }

  async sendPaymentReminders() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const unpaidPayments = await this.paymentModel.findAll({
      where: { month, year, status: PaymentStatus.UNPAID },
      include: [{ model: StudentModel, attributes: ['id', 'first_name', 'last_name'] }],
    });
    let sent = 0;
    for (const payment of unpaidPayments) {
      const student = payment.student as any;
      if (!student) continue;
      await this.notificationService.send({
        userId: Number(student.id),
        title: "To'lov eslatmasi",
        description: `Hurmatli ${student.first_name}, ${(payment as any).month}-oy uchun to'lov qilish muddati yaqin. Iltimos, to'lovni amalga oshiring.`,
        link: '/payments',
      } as any);
      sent++;
    }
    return { sent };
  }

  async checkLessonReminders(groupId: number) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startOfMonth = new Date(year, month - 1, 1);

    const lessonCount = await GroupLessonModel.count({
      where: { group_id: groupId, date: { [Op.gte]: startOfMonth } },
    });

    if (lessonCount < 3) return { sent: 0, reason: `${lessonCount} ta dars o'tkazilgan, 3 ta bo'lishi kerak` };

    const unpaid = await this.paymentModel.findAll({
      where: { group_id: groupId, month, year, status: PaymentStatus.UNPAID },
      include: [{ model: StudentModel, attributes: ['id', 'first_name', 'last_name'] }],
    });

    let sent = 0;
    for (const p of unpaid) {
      const student = p.student as any;
      if (!student) continue;
      await this.notificationService.send({
        userId: Number(student.id),
        title: "To'lov eslatmasi",
        description: `Hurmatli ${student.first_name}, guruhda 3 ta dars o'tdi. Iltimos, ${month}-oy uchun to'lovni amalga oshiring!`,
        link: '/payments',
      } as any);
      sent++;
    }
    return { sent, total_unpaid: unpaid.length };
  }

  async sendAbsenceNotification(studentId: number, lessonDate: string) {
    const student = await this.studentModel.findByPk(studentId, {
      attributes: ['id', 'first_name', 'last_name'],
      include: [{ model: ParentStudentModel, as: 'parent_links' }],
    });
    if (!student) throw new NotFoundException('Student topilmadi');

    await this.notificationService.send({
      userId: Number(studentId),
      title: 'Darsga kelmadingiz',
      description: `${student.first_name}, siz ${lessonDate} sanasidagi darsga kelmadingiz.`,
      link: '/attendance',
    } as any);

    const parentLinks = (student as any).parent_links || [];
    for (const link of parentLinks) {
      const parent = await this.parentModel.findByPk(link.parent_id);
      if (parent) {
        await this.notificationService.send({
          userId: Number(parent.id),
          title: "Farzandingiz darsga kelmadi",
          description: `Farzandingiz ${student.first_name} ${lessonDate} sanasidagi darsga kelmadi.`,
          link: '/attendance',
        } as any);
      }
    }
    return { message: 'Bildirishnoma yuborildi' };
  }
}
