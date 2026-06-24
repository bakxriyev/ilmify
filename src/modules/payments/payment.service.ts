import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Op, Sequelize, WhereOptions } from 'sequelize';
import { QueryTypes } from 'sequelize';
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
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../../services/cache.service';

const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(PaymentModel) private paymentModel: typeof PaymentModel,
    @InjectModel(StudentModel) private studentModel: typeof StudentModel,
    @InjectModel(GroupModel) private groupModel: typeof GroupModel,
    @InjectModel(GroupStudentModel) private groupStudentModel: typeof GroupStudentModel,
    @InjectModel(GroupLessonModel) private groupLessonModel: typeof GroupLessonModel,
    @InjectModel(ParentStudentModel) private parentStudentModel: typeof ParentStudentModel,
    @InjectModel(ParentModel) private parentModel: typeof ParentModel,
    private notificationService: NotificationService,
    private auditService: AuditService,
    private cacheService: CacheService,
    @InjectConnection() private sequelize: Sequelize,
  ) {}

  async create(dto: CreatePaymentDto, user?: any) {
    const student = await this.studentModel.findByPk(dto.student_id);
    if (!student) throw new NotFoundException('Student topilmadi');
    const group = await this.groupModel.findByPk(dto.group_id);
    if (!group) throw new NotFoundException('Guruh topilmadi');

    const existing = await this.paymentModel.findOne({
      where: { student_id: dto.student_id, month: dto.month, year: dto.year },
    });
    if (existing && existing.status === PaymentStatus.PAID) {
      throw new BadRequestException('Bu oy uchun to\'lov allaqachon to\'langan');
    }

    // Status "paid" bo'lsa, paid_at avtomatik shu kunning sanasiga tenglashadi
    let paid_at = dto.paid_at || null;
    if ((dto.status || PaymentStatus.PAID) === PaymentStatus.PAID && !paid_at) {
      paid_at = new Date().toISOString().split('T')[0];
    }

    const centerId = (dto as any).center_id || student.center_id || null;
    const adminId = user?.id || user?.sub || null;
    const adminName = user?.full_name || user?.name || 'Unknown';

    const payment = await this.paymentModel.create({
      student_id: dto.student_id,
      group_id: dto.group_id,
      amount: dto.amount,
      month: dto.month,
      year: dto.year,
      status: dto.status || PaymentStatus.PAID,
      paid_at,
      payment_type: dto.payment_type || null,
      note: dto.note || null,
      created_by: adminId,
      center_id: centerId,
    });

    const studentFullName = `${student.first_name} ${student.last_name}`.trim();
    const monthLabel = monthNames[dto.month - 1] || dto.month;

    this.auditService.log({
      admin_id: adminId || 0,
      admin_name: adminName,
      action: 'create',
      entity_type: 'payment',
      entity_id: payment.id,
      entity_name: studentFullName,
      description: `To'lov qabul qilindi: ${studentFullName} | ${dto.amount} so'm | ${monthLabel} ${dto.year} | Admin: ${adminName}`,
      center_id: centerId,
      details: {
        student_name: studentFullName,
        amount: dto.amount,
        month: dto.month,
        year: dto.year,
        admin_name: adminName,
        admin_id: adminId,
      },
    });

    this.cacheService.del(`cache:${centerId || 'global'}:/payments`);

    return this.paymentModel.findByPk(payment.id, {
      include: [
        { model: StudentModel, attributes: ['id', 'first_name', 'last_name', 'phone_number'] },
        { model: GroupModel, attributes: ['id', 'name', 'monthly_price'] },
      ],
    });
  }

  async findAll(group_id?: number, student_id?: number, month?: number, year?: number, status?: string, payment_type?: string, date_from?: string, date_to?: string, center_id?: number) {
    const where: WhereOptions<any> = {};
    if (center_id) where.center_id = center_id;
    if (group_id) where.group_id = group_id;
    if (student_id) where.student_id = student_id;
    if (month) where.month = month;
    if (year) where.year = year;
    if (status) where.status = status;
    if (payment_type) where.payment_type = payment_type;
    if (date_from || date_to) {
      const paidAtWhere: any = {};
      if (date_from) paidAtWhere[Op.gte] = date_from;
      if (date_to) paidAtWhere[Op.lte] = date_to;
      where.paid_at = paidAtWhere;
    }

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

  async getStudentsOverview(month: number, year: number, center_id?: number) {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const requestedMonthStart = new Date(year, month - 1, 1);
    if (year < 2020 || year > new Date().getFullYear() + 5) return [];

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
    const isFutureMonth = requestedMonthStart > currentMonthStart;

    const relationWhere: any = {};
    if (isCurrentMonth || isFutureMonth) {
      relationWhere.left_date = null;
      relationWhere.joined_date = { [Op.lte]: monthEnd };
    } else {
      const groupsWithLessons = await GroupLessonModel.findAll({
        where: { date: { [Op.gte]: monthStart, [Op.lte]: monthEnd } },
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

    const studentInclude: any = { model: StudentModel, as: 'student', attributes: ['id', 'first_name', 'last_name', 'phone_number'] };
    if (center_id) {
      studentInclude.where = { center_id };
    }

    const relations = await this.groupStudentModel.findAll({
      where: relationWhere,
      include: [
        studentInclude,
        { model: GroupModel, as: 'group', attributes: ['id', 'name', 'monthly_price'] },
      ],
    });

    const paymentsWhere: any = { month, year };
    if (center_id) paymentsWhere.center_id = center_id;
    const allPayments = await this.paymentModel.findAll({ where: paymentsWhere });

    const studentMap = new Map<number, any>();

    for (const rel of relations) {
      const relJson = rel.toJSON() as any;
      const student = relJson.student;
      const group = relJson.group;
      if (!student || !group) continue;
      const key = Number(student.id);

      if (!studentMap.has(key)) {
        studentMap.set(key, {
          student: { id: key, first_name: student.first_name, last_name: student.last_name, phone_number: student.phone_number },
          group: { id: Number(group.id), name: group.name, monthly_price: Number(group.monthly_price) || 0 },
          month, year, relationGroupId: Number(group.id),
        });
      }
    }

    const paymentStudentsToLoad = allPayments
      .filter(p => !studentMap.has(Number(p.student_id)) && p.group_id)
      .map(p => Number(p.student_id));
    const uniqueStudentIds = [...new Set(paymentStudentsToLoad)];
    if (uniqueStudentIds.length > 0) {
      const extraStudents = await this.studentModel.findAll({
        where: { id: uniqueStudentIds },
        attributes: ['id', 'first_name', 'last_name', 'phone_number'],
      });
      const extraStudentMap = new Map(extraStudents.map(s => [Number(s.id), s]));
      const extraGroupIds = [...new Set(allPayments.filter(p => uniqueStudentIds.includes(Number(p.student_id)) && p.group_id).map(p => Number(p.group_id)))];
      const extraGroups = extraGroupIds.length > 0 ? await this.groupModel.findAll({
        where: { id: extraGroupIds },
        attributes: ['id', 'name', 'monthly_price'],
      }) : [];
      const extraGroupMap = new Map(extraGroups.map(g => [Number(g.id), g]));

      for (const p of allPayments) {
        const key = Number(p.student_id);
        if (studentMap.has(key)) continue;
        const stu = extraStudentMap.get(key);
        if (!stu || !p.group_id) continue;
        const grp = extraGroupMap.get(Number(p.group_id));
        if (!grp) continue;
        studentMap.set(key, {
          student: { id: key, first_name: stu.first_name, last_name: stu.last_name, phone_number: stu.phone_number },
          group: { id: Number(grp.id), name: grp.name, monthly_price: Number(grp.monthly_price) || 0 },
          month, year, relationGroupId: Number(grp.id),
        });
      }
    }

    const groupIds = [...new Set(relations.map(r => Number(r.group_id)))];
    const totalLessonsPerGroup = new Map<number, number>();
    if (groupIds.length > 0) {
      const lessonCounts = await this.groupLessonModel.findAll({
        attributes: ['group_id', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
        where: { group_id: groupIds, date: { [Op.gte]: monthStart, [Op.lt]: monthEnd } },
        group: ['group_id'],
        raw: true,
      }) as any[];
      for (const row of lessonCounts) {
        totalLessonsPerGroup.set(Number(row.group_id), Number(row.count));
      }
    }

    const relationsWithJoinAfterStart = relations.filter(r => {
      const gid = Number(r.group_id);
      return totalLessonsPerGroup.get(gid) > 0 && new Date(r.joined_date) > monthStart;
    });
    const remainingLessonsMap = new Map<string, number>();
    if (relationsWithJoinAfterStart.length > 0) {
      for (const rel of relationsWithJoinAfterStart) {
        const gid = Number(rel.group_id);
        const joinDate = new Date(rel.joined_date);
        const key = `${gid}-${joinDate.getTime()}`;
        const count = await this.groupLessonModel.count({
          where: { group_id: gid, date: { [Op.gte]: joinDate, [Op.lt]: monthEnd } },
        });
        remainingLessonsMap.set(key, count);
      }
    }

    const result: any[] = [];
    for (const [, entry] of studentMap) {
      const monthlyPrice = entry.group.monthly_price;
      const groupId = entry.relationGroupId;
      const totalLessons = totalLessonsPerGroup.get(groupId) || 0;

      const studentPayments = allPayments.filter(p => Number(p.student_id) === entry.student.id);
      const paidPayments = studentPayments.filter(p => p.status === PaymentStatus.PAID);
      const partialPayments = studentPayments.filter(p => p.status === PaymentStatus.PARTIAL);
      const totalPaidAmount = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0) +
        partialPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const latestPayment = studentPayments.length > 0 ? studentPayments.reduce((latest, p) =>
        new Date(p.created_at) > new Date(latest.created_at) ? p : latest
      ) : null;

      const relation = relations.find(r => Number(r.student_id) === entry.student.id && Number(r.group_id) === groupId);
      let effectivePrice = monthlyPrice;
      if (totalLessons > 0 && relation) {
        const joinDate = new Date(relation.joined_date);
        if (joinDate > monthStart) {
          const rlKey = `${groupId}-${joinDate.getTime()}`;
          const remainingLessons = remainingLessonsMap.get(rlKey) || 0;
          if (remainingLessons > 0) {
            effectivePrice = Math.round((monthlyPrice / totalLessons) * remainingLessons);
          } else {
            effectivePrice = 0;
          }
        }
      }

      let status = PaymentStatus.UNPAID;
      if (totalPaidAmount >= effectivePrice && effectivePrice > 0) {
        status = PaymentStatus.PAID;
      } else if (totalPaidAmount > 0) {
        status = PaymentStatus.PARTIAL;
      }

      const debt = Math.max(0, effectivePrice - totalPaidAmount);

      // Overdue lessons: faqat o'tgan va joriy oylar uchun hisoblanadi (kelasi oylar uchun 0)
      let overdueLessons = 0;
      if (status !== PaymentStatus.PAID && relation && !isFutureMonth) {
        const allPaymentRecords = [...paidPayments, ...partialPayments];
        const lastPayment = allPaymentRecords.length > 0 ? allPaymentRecords.reduce((latest, p) =>
          new Date(p.paid_at || p.created_at) > new Date(latest.paid_at || latest.created_at) ? p : latest
        ) : null;
        const sinceDate = lastPayment?.paid_at
          ? new Date(lastPayment.paid_at)
          : new Date(relation.joined_date);
        const overdueCount = await this.groupLessonModel.count({
          where: {
            group_id: groupId,
            date: { [Op.gte]: sinceDate, [Op.lt]: new Date() },
          },
        });
        overdueLessons = overdueCount;
      }

      result.push({
        student: entry.student,
        group: entry.group,
        payment: latestPayment ? { id: latestPayment.id, amount: latestPayment.amount, status: latestPayment.status, paid_at: latestPayment.paid_at, payment_type: latestPayment.payment_type, note: latestPayment.note, created_by: latestPayment.created_by, created_at: latestPayment.created_at, student_id: latestPayment.student_id, group_id: latestPayment.group_id, month, year } : null,
        status,
        month,
        year,
        monthly_price: monthlyPrice,
        effective_price: effectivePrice,
        paid_amount: totalPaidAmount,
        debt,
        overdue_lessons: overdueLessons,
      });
    }

    return result;
  }

  async getYearOverview(year: number, center_id?: number) {
    const now = new Date();
    const months = [];
    for (let m = 1; m <= 12; m++) {
      if (year < 2020 || year > new Date().getFullYear() + 5) {
        months.push({ month: m, year, total: 0, paid: 0, unpaid: 0, partial: 0 });
        continue;
      }
      const overview = await this.getStudentsOverview(m, year, center_id);
      const total = overview.length;
      const paid = overview.filter(i => i.status === 'paid').length;
      const unpaid = overview.filter(i => i.status === 'unpaid').length;
      const partial = overview.filter(i => i.status === 'partial').length;
      months.push({ month: m, year, total, paid, unpaid, partial });
    }
    return months;
  }

  async getMonthlyIncome(year: number, center_id?: number) {
    const where: any = { year, status: PaymentStatus.PAID };
    if (center_id) where.center_id = center_id;
    const payments = await this.paymentModel.findAll({ where, raw: true });
    const result = [];
    for (let m = 1; m <= 12; m++) {
      const monthly = payments.filter((p: any) => p.month === m);
      const total = monthly.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      result.push({ month: m, year, total });
    }
    return result;
  }

  async getTotalDebt(month?: number, year?: number, center_id?: number) {
    const now = new Date();
    const m = month || now.getMonth() + 1;
    const y = year || now.getFullYear();
    const overview = await this.getStudentsOverview(m, y, center_id);
    const totalDebt = overview.reduce((sum: number, item: any) => sum + (item.debt || 0), 0);
    const debtorsCount = overview.filter((item: any) => item.status !== 'paid').length;
    return { total_debt: totalDebt, debtors_count: debtorsCount, total_students: overview.length };
  }

  async getAllTimeTotal(center_id?: number) {
    const where: any = { status: PaymentStatus.PAID };
    if (center_id) where.center_id = center_id;
    const total = await this.paymentModel.sum('amount', { where });
    return { total_income: total || 0 };
  }

  async findByGroup(groupId: number, month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const group = await this.groupModel.findByPk(groupId, {
      attributes: ['id', 'name', 'monthly_price'],
    });
    const monthlyPrice = Number(group?.monthly_price) || 0;

    // Shu oyda guruhda faol bo'lgan studentlarni olish
    const isCurrentMonth = targetMonth === now.getMonth() + 1 && targetYear === now.getFullYear();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const requestedMonthStart = new Date(targetYear, targetMonth - 1, 1);
    const isFutureMonth = requestedMonthStart > currentMonthStart;
    const groupStudentWhere: any = { group_id: groupId };
    groupStudentWhere.joined_date = { [Op.lte]: monthEnd };
    if (isCurrentMonth || isFutureMonth) {
      groupStudentWhere.left_date = null;
    } else {
      groupStudentWhere[Op.or] = [
        { left_date: null },
        { left_date: { [Op.gte]: monthStart } },
      ];
    }

    const groupStudents = await this.groupStudentModel.findAll({
      where: groupStudentWhere,
    });

    // Build student join_date map
    const joinDateMap = new Map<number, Date>();
    for (const gs of groupStudents) {
      const sid = Number(gs.student_id);
      if (!joinDateMap.has(sid) || (gs.joined_date && (!joinDateMap.get(sid) || new Date(gs.joined_date) < joinDateMap.get(sid)!))) {
        joinDateMap.set(sid, new Date(gs.joined_date));
      }
    }

    const studentIds = groupStudents.map(gs => gs.student_id);
    const students = await this.studentModel.findAll({
      where: { id: studentIds },
      attributes: ['id', 'first_name', 'last_name', 'phone_number'],
    });

    const payments = await this.paymentModel.findAll({
      where: { group_id: groupId, month: targetMonth, year: targetYear },
    });

    // Count total lessons in this month for the group (for proration)
    const totalLessonsInMonth = await this.groupLessonModel.count({
      where: {
        group_id: groupId,
        date: { [Op.gte]: monthStart, [Op.lt]: monthEnd },
      },
    });

    const overdueDays = Math.max(0, Math.floor((now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));

    const studentsNeedingProration = students.filter(s => {
      if (totalLessonsInMonth === 0) return false;
      const joinDate = joinDateMap.get(Number(s.id));
      return joinDate && joinDate > monthStart;
    });
    const remainingLessonsMap = new Map<number, number>();
    if (studentsNeedingProration.length > 0) {
      const results: any[] = [];
      for (const s of studentsNeedingProration) {
        const joinDate = joinDateMap.get(Number(s.id))!;
        const key = Number(s.id);
        const count = await this.groupLessonModel.count({
          where: { group_id: groupId, date: { [Op.gte]: joinDate, [Op.lt]: monthEnd } },
        });
        remainingLessonsMap.set(key, count);
      }
    }

    const result = students.map((s) => {
      const payment = payments.find(p => Number(p.student_id) === Number(s.id));
      const status = payment?.status || PaymentStatus.UNPAID;
      const paidAmount = payment && payment.status === PaymentStatus.PAID ? Number(payment.amount) : 0;

      let effectivePrice = monthlyPrice;
      if (totalLessonsInMonth > 0 && status !== PaymentStatus.PAID) {
        const joinDate = joinDateMap.get(Number(s.id));
        if (joinDate && joinDate > monthStart) {
          const remainingLessons = remainingLessonsMap.get(Number(s.id)) || 0;
          if (remainingLessons > 0) {
            const pricePerLesson = monthlyPrice / totalLessonsInMonth;
            effectivePrice = Math.round(pricePerLesson * remainingLessons);
          } else {
            effectivePrice = 0;
          }
        }
      }

      const debt = status === PaymentStatus.PAID ? 0 : Math.max(0, effectivePrice - paidAmount);

      const paymentType = payment?.payment_type || null;

      return {
        student: { id: s.id, first_name: s.first_name, last_name: s.last_name, phone_number: s.phone_number },
        group: { id: groupId, name: group?.name || '', monthly_price: monthlyPrice },
        payment: payment || null,
        payment_type: paymentType,
        status,
        month: targetMonth,
        year: targetYear,
        monthly_price: monthlyPrice,
        effective_price: effectivePrice,
        paid_amount: paidAmount,
        debt,
        overdue_days: status === PaymentStatus.PAID ? 0 : overdueDays,
        joined_date: joinDateMap.get(Number(s.id))?.toISOString().split('T')[0] || null,
      };
    });

    return result;
  }

  async update(id: number, dto: UpdatePaymentDto, user?: any) {
    const payment = await this.paymentModel.findByPk(id, {
      include: [
        { model: StudentModel, attributes: ['id', 'first_name', 'last_name', 'phone_number'] },
        { model: GroupModel, attributes: ['id', 'name'] },
      ],
    });
    if (!payment) throw new NotFoundException('To\'lov topilmadi');
    
    // Agar status "paid" o'zgartirilsa, avtomatik paid_at-ni bugunning sanasiga tenglash
    if (dto.status === PaymentStatus.PAID && !dto.paid_at) {
      dto.paid_at = new Date().toISOString().split('T')[0];
    }
    
    // Agar paid_at berilsa, lekin status berilmasa, status PAID bo'ladi
    if (dto.paid_at && !dto.status) {
      dto.status = PaymentStatus.PAID;
    }

    const oldStatus = payment.status;
    const oldAmount = Number(payment.amount);
    
    await payment.update(dto);
    
    const adminName = user?.full_name || user?.name || 'Unknown';
    const adminId = user?.id || user?.sub || 0;
    const studentName = payment.student ? `${(payment.student as any).first_name} ${(payment.student as any).last_name}`.trim() : (payment as any).student_name || '';
    const monthLabel = monthNames[Number(payment.month) - 1] || payment.month;
    const newAmount = dto.amount !== undefined ? Number(dto.amount) : oldAmount;
    const newStatus = dto.status || oldStatus;

    this.auditService.log({
      admin_id: adminId,
      admin_name: adminName,
      action: 'update',
      entity_type: 'payment',
      entity_id: id,
      entity_name: studentName,
      description: `To'lov yangilandi: ${studentName} | ${newAmount} so'm | ${monthLabel} ${payment.year} | ${oldStatus} -> ${newStatus} | Admin: ${adminName}`,
      center_id: payment.center_id,
      details: {
        student_name: studentName,
        old_amount: oldAmount,
        new_amount: newAmount,
        old_status: oldStatus,
        new_status: newStatus,
        month: payment.month,
        year: payment.year,
        admin_name: adminName,
      },
    });

    this.cacheService.del(`cache:${payment.center_id || 'global'}:/payments`);

    return this.paymentModel.findByPk(id, {
      include: [
        { model: StudentModel, attributes: ['id', 'first_name', 'last_name'] },
        { model: GroupModel, attributes: ['id', 'name'] },
      ],
    });
  }

  async remove(id: number, user?: any) {
    const payment = await this.paymentModel.findByPk(id, {
      include: [
        { model: StudentModel, attributes: ['id', 'first_name', 'last_name'] },
      ],
    });
    if (!payment) throw new NotFoundException('To\'lov topilmadi');

    const studentName = payment.student ? `${(payment.student as any).first_name} ${(payment.student as any).last_name}`.trim() : '';
    const monthLabel = monthNames[Number(payment.month) - 1] || payment.month;
    const adminName = user?.full_name || user?.name || 'Unknown';
    const adminId = user?.id || user?.sub || 0;
    const amount = Number(payment.amount);

    await payment.destroy();

    this.auditService.log({
      admin_id: adminId,
      admin_name: adminName,
      action: 'delete',
      entity_type: 'payment',
      entity_id: id,
      entity_name: studentName,
      description: `To'lov o'chirildi: ${studentName} | ${amount} so'm | ${monthLabel} ${payment.year} | Admin: ${adminName}`,
      center_id: payment.center_id,
      details: {
        student_name: studentName,
        amount,
        month: payment.month,
        year: payment.year,
        admin_name: adminName,
      },
    });

    this.cacheService.del(`cache:${payment.center_id || 'global'}:/payments`);

    return { message: 'To\'lov o\'chirildi' };
  }

  async removeAllByCenter(center_id: number) {
    const deleteCount = await this.paymentModel.destroy({
      where: {
        [Op.or]: [
          { center_id },
          { center_id: null },
        ],
      },
    });
    this.cacheService.del(`cache:${center_id}:/payments`);
    this.cacheService.del(`cache:global:/payments`);
    return { message: `${deleteCount} ta to'lov o'chirildi`, deleted_count: deleteCount };
  }

  async getStats(center_id?: number) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    const totalPayments = await this.paymentModel.count({ where });
    const paidCount = await this.paymentModel.count({ where: { ...where, status: PaymentStatus.PAID } });
    const unpaidCount = await this.paymentModel.count({ where: { ...where, status: PaymentStatus.UNPAID } });
    const partialCount = await this.paymentModel.count({ where: { ...where, status: PaymentStatus.PARTIAL } });
    const totalAmount = await this.paymentModel.sum('amount', { where: { ...where, status: PaymentStatus.PAID } });
    return { total: totalPayments, paid: paidCount, unpaid: unpaidCount, partial: partialCount, total_amount: totalAmount || 0 };
  }

  async autoGenerateMonthlyPayments() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    const groups = await this.groupModel.findAll({ where: { monthly_price: { [Op.gt]: 0 } } });
    if (groups.length === 0) return { created: 0, month, year };

    const groupIds = groups.map(g => Number(g.id));
    let created = 0;

    const totalLessonsByGroup = new Map<number, number>();
    const lessonRows = await this.groupLessonModel.findAll({
      attributes: ['group_id', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      where: { group_id: groupIds, date: { [Op.gte]: monthStart, [Op.lt]: monthEnd } },
      group: ['group_id'],
      raw: true,
    }) as any[];
    for (const row of lessonRows) {
      totalLessonsByGroup.set(Number(row.group_id), Number(row.count));
    }

    const existingPayments = await this.paymentModel.findAll({
      where: { month, year, group_id: groupIds },
      attributes: ['student_id', 'group_id'],
      raw: true,
    });
    const existingSet = new Set<string>();
    for (const p of existingPayments as any[]) {
      existingSet.add(`${p.student_id}-${p.group_id}`);
    }

    const studentCenterIds = new Map<number, number | null>();
    for (const group of groups) {
      const totalLessonsInMonth = totalLessonsByGroup.get(Number(group.id)) || 0;
      const monthlyPrice = Number(group.monthly_price);
      const relations = await this.groupStudentModel.findAll({
        where: { group_id: group.id },
        attributes: ['student_id', 'joined_date'],
      });

      for (const rel of relations) {
        const key = `${rel.student_id}-${group.id}`;
        if (existingSet.has(key)) continue;

        let amount = monthlyPrice;
        if (totalLessonsInMonth > 0 && rel.joined_date) {
          const joinDate = new Date(rel.joined_date);
          if (joinDate > monthStart) {
            const remainingLessons = await this.groupLessonModel.count({
              where: { group_id: group.id, date: { [Op.gte]: joinDate, [Op.lt]: monthEnd } },
            });
            if (remainingLessons > 0) {
              amount = Math.round((monthlyPrice / totalLessonsInMonth) * remainingLessons);
            } else {
              amount = 0;
            }
          }
        }

        let centerId = studentCenterIds.get(Number(rel.student_id));
        if (centerId === undefined) {
          const stu = await this.studentModel.findByPk(rel.student_id, { attributes: ['center_id'] });
          centerId = stu?.center_id || null;
          studentCenterIds.set(Number(rel.student_id), centerId);
        }

        await this.paymentModel.create({
          student_id: rel.student_id,
          group_id: group.id,
          amount,
          month,
          year,
          status: PaymentStatus.UNPAID,
          center_id: centerId,
        });
        created++;
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

  async exportToExcel(month: number, year: number, center_id?: number) {
    const data = await this.getStudentsOverview(month, year, center_id);
    const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

    const paymentTypeLabel = (type: string | null | undefined) => {
      if (!type) return '-';
      const map: any = { click: 'Click', naqt: 'Naqt', karta: 'Karta' };
      return map[type] || type;
    };

    const exportData = data.map((item: any, index: number) => ({
      'No': index + 1,
      'Student Ismi': `${item.student.first_name} ${item.student.last_name}`,
      'Telefon': item.student.phone_number || '-',
      'Guruh': item.group?.name || '-',
      'Oy': monthNames[month - 1],
      'Yil': year,
      'Oylik narx': item.monthly_price,
      'Unumli narx': item.effective_price,
      'To\'langan': item.paid_amount,
      'Qarz': item.debt,
      'Status': item.status === 'paid' ? 'To\'langan' : item.status === 'unpaid' ? 'To\'lanmagan' : 'Qisman',
      'To\'lov turi': paymentTypeLabel(item.payment?.payment_type),
      'Kechikkan darslar': item.overdue_lessons || 0,
      'Izoh': item.payment?.note || '',
    }));

    const totalStudents = data.length;
    const totalPaid = data.filter((i: any) => i.status === 'paid').length;
    const totalUnpaid = data.filter((i: any) => i.status === 'unpaid').length;
    const totalPartial = data.filter((i: any) => i.status === 'partial').length;
    const sumOylik = data.reduce((s: number, i: any) => s + Number(i.monthly_price), 0);
    const sumEffective = data.reduce((s: number, i: any) => s + Number(i.effective_price), 0);
    const sumPaid = data.reduce((s: number, i: any) => s + Number(i.paid_amount), 0);
    const sumDebt = data.reduce((s: number, i: any) => s + Number(i.debt), 0);

    return { exportData, summary: { totalStudents, totalPaid, totalUnpaid, totalPartial, sumOylik, sumEffective, sumPaid, sumDebt, month, year } };
  }

  async getStudentDebts(studentId: number, center_id?: number) {
    const student = await this.studentModel.findByPk(studentId, {
      attributes: ['id', 'first_name', 'last_name', 'phone_number', 'center_id'],
    });
    if (!student) throw new NotFoundException('Student topilmadi');
    if (center_id && Number(student.center_id) !== center_id) {
      throw new NotFoundException('Student topilmadi');
    }

    const now = new Date();
    const debts: any[] = [];
    const paidPayments: any[] = [];
    const orphanedPayments: any[] = [];
    const processedMonths = new Set<string>();

    const allPayments = await this.paymentModel.findAll({
      where: { student_id: studentId },
      include: [{ model: GroupModel, attributes: ['id', 'name', 'monthly_price'] }],
    });

    const groupStudents = await this.groupStudentModel.findAll({
      where: { student_id: studentId },
      include: [{ model: GroupModel, as: 'group', attributes: ['id', 'name', 'monthly_price'] }],
    });

    const groupIds = groupStudents.map(gs => Number(gs.group_id)).filter(Boolean);
    const lessonCountByGroupMonth = new Map<string, number>();
    if (groupIds.length > 0) {
      const lessonRows = await this.sequelize.query(`
        SELECT
          group_id,
          EXTRACT(YEAR FROM date)::int as year,
          EXTRACT(MONTH FROM date)::int as month,
          COUNT(*)::int as count
        FROM group_lessons
        WHERE group_id = ANY($1::int[])
        GROUP BY group_id, EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
      `, {
        bind: [groupIds],
        type: QueryTypes.SELECT,
      }) as any[];
      for (const row of lessonRows) {
        const key = `${row.group_id}-${row.year}-${row.month}`;
        lessonCountByGroupMonth.set(key, row.count);
      }
    }

    for (const groupStudent of groupStudents) {
      const group = (groupStudent as any).group;
      if (!group) continue;

      const monthlyPrice = Number(group.monthly_price) || 0;
      const joinedDate = new Date(groupStudent.joined_date);
      const leftDate = groupStudent.left_date ? new Date(groupStudent.left_date) : null;
      const groupId = Number(group.id);

      let currentDate = new Date(joinedDate.getFullYear(), joinedDate.getMonth(), 1);
      const currentNow = new Date(now.getFullYear(), now.getMonth(), 1);

      while (currentDate <= currentNow && (!leftDate || currentDate <= new Date(leftDate.getFullYear(), leftDate.getMonth(), 1))) {
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const monthKey = `${groupId}-${year}-${month}`;

        if (processedMonths.has(monthKey)) {
          currentDate = new Date(year, month, 1);
          continue;
        }
        processedMonths.add(monthKey);

        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0, 23, 59, 59);
        const lessonKey = `${groupId}-${year}-${month}`;
        const totalLessons = lessonCountByGroupMonth.get(lessonKey) || 0;

        const payment = allPayments.find(p =>
          Number(p.month) === month &&
          Number(p.year) === year &&
          Number(p.group_id) === groupId
        );

        if (totalLessons === 0 && !payment) {
          currentDate = new Date(year, month, 1);
          continue;
        }

        let effectivePrice = 0;
        if (totalLessons > 0) {
          effectivePrice = monthlyPrice;
          if (joinedDate > monthStart) {
            const remainingLessons = await this.groupLessonModel.count({
              where: { group_id: groupId, date: { [Op.gte]: joinedDate, [Op.lt]: monthEnd } },
            });
            if (remainingLessons > 0) {
              effectivePrice = Math.round((monthlyPrice / totalLessons) * remainingLessons);
            } else {
              effectivePrice = 0;
            }
          }
        }

        const paymentType = payment?.payment_type || null;

        if (payment) {
          const paidAmount = Number(payment.amount);
          const isPaid = payment.status === PaymentStatus.PAID;
          if (isPaid && paidAmount >= effectivePrice && effectivePrice > 0) {
            paidPayments.push({
              id: payment.id, month, year,
              group_id: groupId, group_name: group.name,
              amount: paidAmount, status: 'paid',
              paid_at: payment.paid_at,
              payment_type: paymentType,
            });
          } else if (isPaid && paidAmount > 0) {
            paidPayments.push({
              id: payment.id, month, year,
              group_id: groupId, group_name: group.name,
              amount: paidAmount, status: 'partial',
              paid_at: payment.paid_at,
              payment_type: paymentType,
            });
            if (effectivePrice > paidAmount) {
              debts.push({
                month, year,
                group_id: groupId, group_name: group.name,
                amount: effectivePrice - paidAmount,
                full_amount: effectivePrice, paid_amount: paidAmount,
                status: 'partial',
              });
            }
          } else {
            if (effectivePrice > 0) {
              debts.push({
                id: payment.id, month, year,
                group_id: groupId, group_name: group.name,
                amount: effectivePrice, status: payment.status || 'unpaid',
              });
            }
          }
        } else {
          if (totalLessons > 0 && monthStart <= now && effectivePrice > 0) {
            debts.push({
              month, year,
              group_id: groupId, group_name: group.name,
              amount: effectivePrice,
              status: 'unpaid',
              is_auto_generated: true,
            });
          }
        }

        currentDate = new Date(year, month, 1);
      }
    }

    // 4. ORPHANED TO'LOVLAR (group_id = null) → alohida field
    for (const payment of allPayments) {
      if (!payment.group_id) {
        const exists = [...debts, ...paidPayments].some(
          item => item.month === Number(payment.month) && item.year === Number(payment.year)
        );
        if (!exists) {
          orphanedPayments.push({
            id: payment.id,
            month: payment.month, year: payment.year,
            amount: Number(payment.amount),
            status: payment.status,
            paid_at: payment.paid_at,
            payment_type: payment.payment_type,
            created_at: payment.created_at,
            note: payment.note,
          });
        }
      }
    }

    // 5. Sortirlash
    debts.sort((a, b) => (b.year - a.year) || (b.month - a.month));
    paidPayments.sort((a, b) => (b.year - a.year) || (b.month - a.month));
    orphanedPayments.sort((a, b) => (b.year - a.year) || (b.month - a.month));

    const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

    const activeGroups = groupStudents
      .filter(gs => !gs.left_date)
      .map(gs => ({ id: Number((gs as any).group?.id || gs.group_id), name: (gs as any).group?.name || '' }))
      .filter(g => g.id > 0);

    return {
      student: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        phone_number: student.phone_number,
      },
      debts: debts.map(d => ({ ...d, month_name: monthNames[d.month - 1] })),
      paid_payments: paidPayments.map(p => ({ ...p, month_name: monthNames[p.month - 1] })),
      orphaned_payments: orphanedPayments.map(p => ({ ...p, month_name: monthNames[p.month - 1] })),
      total_debt: debts.reduce((sum, d) => sum + (d.amount || 0), 0),
      paid_total: paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      student_groups: activeGroups,
    };
  }
}
