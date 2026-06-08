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
    @InjectModel(GroupLessonModel) private groupLessonModel: typeof GroupLessonModel,
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

    // Status "paid" bo'lsa, paid_at avtomatik shu kunning sanasiga tenglashadi
    let paid_at = dto.paid_at || null;
    if ((dto.status || PaymentStatus.PAID) === PaymentStatus.PAID && !paid_at) {
      paid_at = new Date().toISOString().split('T')[0];
    }

    const payment = await this.paymentModel.create({
      student_id: dto.student_id,
      group_id: dto.group_id,
      amount: dto.amount,
      month: dto.month,
      year: dto.year,
      status: dto.status || PaymentStatus.PAID,
      paid_at,
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

  async getStudentsOverview(month: number, year: number, center_id?: number) {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const requestedMonthStart = new Date(year, month - 1, 1);
    if (requestedMonthStart > currentMonthStart) return [];

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

    // 1. Shu oyda guruhda bo'lgan studentlarni topish
    const relationWhere: any = {};
    if (isCurrentMonth) {
      relationWhere.left_date = null;
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

    // 2. Shu oy ichida to'lov qilgan studentlarni ham olish (guruhdan chiqib ketgan bo'lsa ham)
    const paymentsWhere: any = { month, year };
    if (center_id) paymentsWhere.center_id = center_id;
    const allPayments = await this.paymentModel.findAll({ where: paymentsWhere });

    // 3. Ikkalasini birlashtirish — har bir student faqat 1 marta
    const studentMap = new Map<number, any>();

    // Avval guruhdagi studentlarni qo'shamiz
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

    // Keyin to'lov qilganlarni qo'shamiz (agar mavjud bo'lmasa)
    for (const p of allPayments) {
      const pJson = p.toJSON() as any;
      const key = Number(pJson.student_id);
      if (!studentMap.has(key)) {
        // Studentni alohida yuklaymiz
        const stu = await this.studentModel.findByPk(key, { attributes: ['id', 'first_name', 'last_name', 'phone_number'] });
        if (!stu) continue;
        if (!pJson.group_id) continue; // Guruhi o'chirilgan to'lovlarni overview-da ko'rsatmaymiz
        const grp = await this.groupModel.findByPk(pJson.group_id, { attributes: ['id', 'name', 'monthly_price'] });
        if (!grp) continue;
        studentMap.set(key, {
          student: { id: key, first_name: stu.first_name, last_name: stu.last_name, phone_number: stu.phone_number },
          group: { id: Number(grp.id), name: grp.name, monthly_price: Number(grp.monthly_price) || 0 },
          month, year, relationGroupId: Number(grp.id),
        });
      }
    }

    // 4. Barcha guruhlar uchun oylik darslar sonini oldindan hisoblaymiz (proration uchun)
    const groupIds = [...new Set(relations.map(r => Number(r.group_id)))];
    const totalLessonsPerGroup = new Map<number, number>();
    for (const gid of groupIds) {
      const count = await this.groupLessonModel.count({
        where: { group_id: gid, date: { [Op.gte]: monthStart, [Op.lt]: monthEnd } },
      });
      totalLessonsPerGroup.set(gid, count);
    }

    const result: any[] = [];
    for (const [, entry] of studentMap) {
      const monthlyPrice = entry.group.monthly_price;
      const groupId = entry.relationGroupId;
      const totalLessons = totalLessonsPerGroup.get(groupId) || 0;

      // Studentning shu oydagi barcha to'lovlarini topamiz (istalgan guruh bo'yicha)
      const studentPayments = allPayments.filter(p => Number(p.student_id) === entry.student.id);
      const totalPaidAmount = studentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const latestPayment = studentPayments.length > 0 ? studentPayments.reduce((latest, p) =>
        new Date(p.created_at) > new Date(latest.created_at) ? p : latest
      ) : null;

      // Proratsiya: o'quvchi qo'shilgan sanadan boshlab qolgan darslar soniga qarab narxni hisoblash
      const relation = relations.find(r => Number(r.student_id) === entry.student.id && Number(r.group_id) === groupId);
      let effectivePrice = monthlyPrice;
      if (totalLessons > 0 && relation) {
        const joinDate = new Date(relation.joined_date);
        if (joinDate > monthStart) {
          const remainingLessons = await this.groupLessonModel.count({
            where: { group_id: groupId, date: { [Op.gte]: joinDate, [Op.lt]: monthEnd } },
          });
          if (remainingLessons > 0) {
            effectivePrice = Math.round((monthlyPrice / totalLessons) * remainingLessons);
          } else {
            effectivePrice = 0;
          }
        }
      }

      // Status: to'lov summasiga qarab
      let status = PaymentStatus.UNPAID;
      if (totalPaidAmount >= effectivePrice && effectivePrice > 0) {
        status = PaymentStatus.PAID;
      } else if (totalPaidAmount > 0) {
        status = PaymentStatus.PARTIAL;
      }

      const debt = Math.max(0, effectivePrice - totalPaidAmount);

      result.push({
        student: entry.student,
        group: entry.group,
        payment: latestPayment ? { id: latestPayment.id, amount: latestPayment.amount, status: latestPayment.status, paid_at: latestPayment.paid_at, note: latestPayment.note, created_by: latestPayment.created_by, created_at: latestPayment.created_at, student_id: latestPayment.student_id, group_id: latestPayment.group_id, month, year } : null,
        status,
        month,
        year,
        monthly_price: monthlyPrice,
        effective_price: effectivePrice,
        paid_amount: totalPaidAmount,
        debt,
        overdue_lessons: status === PaymentStatus.PAID ? 0 : await this.groupLessonModel.count({
          where: { group_id: groupId, date: { [Op.lt]: now } },
        }),
      });
    }

    return result;
  }

  async getYearOverview(year: number, center_id?: number) {
    const now = new Date();
    const months = [];
    for (let m = 1; m <= 12; m++) {
      if (year > now.getFullYear() || (year === now.getFullYear() && m > now.getMonth() + 1)) {
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

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const requestedMonthStart = new Date(targetYear, targetMonth - 1, 1);
    if (requestedMonthStart > currentMonthStart) return [];

    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const group = await this.groupModel.findByPk(groupId, {
      attributes: ['id', 'name', 'monthly_price'],
    });
    const monthlyPrice = Number(group?.monthly_price) || 0;

    // Shu oyda guruhda faol bo'lgan studentlarni olish
    const isCurrentMonth = targetMonth === now.getMonth() + 1 && targetYear === now.getFullYear();
    const groupStudentWhere: any = { group_id: groupId };
    groupStudentWhere.joined_date = { [Op.lte]: monthEnd };
    if (isCurrentMonth) {
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

    return Promise.all(students.map(async (s) => {
      const payment = payments.find(p => Number(p.student_id) === Number(s.id));
      const status = payment?.status || PaymentStatus.UNPAID;
      const paidAmount = payment ? Number(payment.amount) : 0;

      // Prorate monthly_price based on remaining lessons from join date
      let effectivePrice = monthlyPrice;
      if (totalLessonsInMonth > 0 && status !== PaymentStatus.PAID) {
        const joinDate = joinDateMap.get(Number(s.id));
        if (joinDate && joinDate > monthStart) {
          // Aniq: qo'shilgan sanadan boshlab oy oxirigacha nechta dars qolgan
          const remainingLessons = await this.groupLessonModel.count({
            where: {
              group_id: groupId,
              date: { [Op.gte]: joinDate, [Op.lt]: monthEnd },
            },
          });
          if (remainingLessons > 0) {
            const pricePerLesson = monthlyPrice / totalLessonsInMonth;
            effectivePrice = Math.round(pricePerLesson * remainingLessons);
          } else {
            effectivePrice = 0;
          }
        }
      }

      const debt = status === PaymentStatus.PAID ? 0 : Math.max(0, effectivePrice - paidAmount);

      return {
        student: { id: s.id, first_name: s.first_name, last_name: s.last_name, phone_number: s.phone_number },
        group: { id: groupId, name: group?.name || '', monthly_price: monthlyPrice },
        payment: payment || null,
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
    }));
  }

  async update(id: number, dto: UpdatePaymentDto) {
    const payment = await this.paymentModel.findByPk(id);
    if (!payment) throw new NotFoundException('To\'lov topilmadi');
    
    // Agar status "paid" o'zgartirilsa, avtomatik paid_at-ni bugunning sanasiga tenglash
    if (dto.status === PaymentStatus.PAID && !dto.paid_at) {
      dto.paid_at = new Date().toISOString().split('T')[0];
    }
    
    // Agar paid_at berilsa, lekin status berilmasa, status PAID bo'ladi
    if (dto.paid_at && !dto.status) {
      dto.status = PaymentStatus.PAID;
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
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    const groups = await this.groupModel.findAll({ where: { monthly_price: { [Op.gt]: 0 } } });
    let created = 0;
    for (const group of groups) {
      const monthlyPrice = Number(group.monthly_price);
      // Oy uchun jami darslar soni
      const totalLessonsInMonth = await this.groupLessonModel.count({
        where: { group_id: group.id, date: { [Op.gte]: monthStart, [Op.lt]: monthEnd } },
      });
      const relations = await this.groupStudentModel.findAll({ where: { group_id: group.id } });
      for (const rel of relations) {
        const exists = await this.paymentModel.findOne({ where: { student_id: rel.student_id, month, year } });
        if (!exists) {
          // Proratsiya: qo'shilgan sanadan qolgan darslar hisobiga
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
          await this.paymentModel.create({
            student_id: rel.student_id,
            group_id: group.id,
            amount,
            month,
            year,
            status: PaymentStatus.UNPAID,
          });
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

  async exportToExcel(month: number, year: number, center_id?: number) {
    const data = await this.getStudentsOverview(month, year, center_id);
    const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

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

  async getStudentDebts(studentId: number) {
    const student = await this.studentModel.findByPk(studentId, {
      attributes: ['id', 'first_name', 'last_name', 'phone_number'],
    });
    if (!student) throw new NotFoundException('Student topilmadi');

    const now = new Date();
    const debts: any[] = [];
    const paidPayments: any[] = [];
    const orphanedPayments: any[] = [];
    const processedMonths = new Set<string>();

    // 1. BARCHA to'lovlarni olish
    const allPayments = await this.paymentModel.findAll({
      where: { student_id: studentId },
      include: [{ model: GroupModel, attributes: ['id', 'name', 'monthly_price'] }],
    });

    // 2. Guruhga biriktirilganlik ma'lumotlari
    const groupStudents = await this.groupStudentModel.findAll({
      where: { student_id: studentId },
      include: [{ model: GroupModel, as: 'group', attributes: ['id', 'name', 'monthly_price'] }],
    });

    // 3. HAR BIR GURUH UCHUN OYLARNI TAKRORLASH
    //    (faqat group_id != null bo'lgan to'lovlar va guruhdagi studentlar)
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
        const monthKey = `${year}-${month}`;

        if (processedMonths.has(monthKey)) {
          currentDate = new Date(year, month, 1);
          continue;
        }
        processedMonths.add(monthKey);

        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0, 23, 59, 59);
        const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

        if (isCurrentMonth) {
          // HOZIRGI OY: FULL PRICE (proratsiya YO'Q)
          // Chunki student hali barcha darslarga qatnashishi mumkin
          const payment = allPayments.find(p =>
            Number(p.month) === month &&
            Number(p.year) === year &&
            Number(p.group_id) === groupId
          );
          if (payment) {
            const paidAmount = Number(payment.amount);
            if (paidAmount >= monthlyPrice) {
              paidPayments.push({
                id: payment.id, month, year,
                group_id: groupId, group_name: group.name,
                amount: paidAmount, status: 'paid',
                paid_at: payment.paid_at,
              });
            } else if (paidAmount > 0) {
              paidPayments.push({
                id: payment.id, month, year,
                group_id: groupId, group_name: group.name,
                amount: paidAmount, status: 'partial',
                paid_at: payment.paid_at,
              });
              debts.push({
                month, year,
                group_id: groupId, group_name: group.name,
                amount: monthlyPrice - paidAmount,
                full_amount: monthlyPrice, paid_amount: paidAmount,
                status: 'partial',
              });
            } else {
              debts.push({
                month, year,
                group_id: groupId, group_name: group.name,
                amount: monthlyPrice, status: 'unpaid',
              });
            }
          } else {
            // Hozirgi oy uchun to'lov yo'q → FULL PRICE bilan qarzdorlik
            debts.push({
              month, year,
              group_id: groupId, group_name: group.name,
              amount: monthlyPrice,
              status: 'unpaid',
              is_auto_generated: true,
            });
          }
        } else {
          // O'TGAN OYLAR: Proratsiya bo'yicha hisoblash
          const totalLessons = await this.groupLessonModel.count({
            where: { group_id: groupId, date: { [Op.gte]: monthStart, [Op.lt]: monthEnd } },
          });

          let effectivePrice = monthlyPrice;
          let remainingLessons = totalLessons;

          if (totalLessons > 0) {
            if (joinedDate > monthStart) {
              remainingLessons = await this.groupLessonModel.count({
                where: { group_id: groupId, date: { [Op.gte]: joinedDate, [Op.lt]: monthEnd } },
              });
            }
            if (remainingLessons > 0) {
              effectivePrice = Math.round((monthlyPrice / totalLessons) * remainingLessons);
            } else {
              effectivePrice = 0;
            }
          }

          const payment = allPayments.find(p =>
            Number(p.month) === month &&
            Number(p.year) === year &&
            Number(p.group_id) === groupId
          );

          if (payment) {
            const paidAmount = Number(payment.amount);
            if (paidAmount >= effectivePrice) {
              paidPayments.push({
                id: payment.id, month, year,
                group_id: groupId, group_name: group.name,
                amount: paidAmount, status: 'paid',
                paid_at: payment.paid_at,
              });
            } else if (paidAmount > 0) {
              paidPayments.push({
                id: payment.id, month, year,
                group_id: groupId, group_name: group.name,
                amount: paidAmount, status: 'partial',
                paid_at: payment.paid_at,
              });
              debts.push({
                month, year,
                group_id: groupId, group_name: group.name,
                amount: effectivePrice - paidAmount,
                full_amount: effectivePrice, paid_amount: paidAmount,
                status: 'partial',
              });
            } else {
              debts.push({
                month, year,
                group_id: groupId, group_name: group.name,
                amount: effectivePrice, status: 'unpaid',
              });
            }
          } else {
            if (totalLessons > 0 && remainingLessons > 0 && monthStart <= now) {
              debts.push({
                month, year,
                group_id: groupId, group_name: group.name,
                amount: effectivePrice,
                status: 'unpaid',
                is_auto_generated: true,
              });
            }
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
    };
  }
}
