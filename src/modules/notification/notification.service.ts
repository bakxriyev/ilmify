import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { NotificationModel } from './entities/notification.entity';
import { NotificationTemplateModel } from './entities/notification-template.entity';
import { NotificationGateway } from './notification.gateway';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { StudentModel } from '../students/model/student.entity';
import { TeacherModel } from '../teachers/model/teacher.model';
import { GroupStudentModel } from '../group_student_model';
import { GroupModel } from '../groups/model/group.entity';
import { PaymentModel } from '../payments/entities/payment.entity';

const MONTH_NAMES_UZ: Record<number, string> = {
  1: 'Yanvar', 2: 'Fevral', 3: 'Mart', 4: 'Aprel',
  5: 'May', 6: 'Iyun', 7: 'Iyul', 8: 'Avgust',
  9: 'Sentabr', 10: 'Oktabr', 11: 'Noyabr', 12: 'Dekabr',
};

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(NotificationModel)
    private notificationModel: typeof NotificationModel,
    @InjectModel(NotificationTemplateModel)
    private templateModel: typeof NotificationTemplateModel,
    @InjectModel(StudentModel)
    private studentModel: typeof StudentModel,
    @InjectModel(TeacherModel)
    private teacherModel: typeof TeacherModel,
    @InjectModel(GroupStudentModel)
    private groupStudentModel: typeof GroupStudentModel,
    @InjectModel(GroupModel)
    private groupModel: typeof GroupModel,
    @InjectModel(PaymentModel)
    private paymentModel: typeof PaymentModel,
    private gateway: NotificationGateway,
  ) {}

  async send(dto: CreateNotificationDto, imagePath?: string) {
    let template: NotificationTemplateModel | null = null;
    if (dto.template_id) {
      template = await this.templateModel.findByPk(Number(dto.template_id));
    }

    const targets = await this.resolveTargets(dto);
    if (targets.length === 0) throw new Error('Hech qanday qabul qiluvchi topilmadi');

    const created: NotificationModel[] = [];
    const senderType = dto.sender_type || 'admin';
    const senderId = dto.sender_id || null;
    const centerId = dto.center_id || null;

    // Collect and normalize all student IDs to numbers
    const targetStudentIds = targets
      .map(t => t.studentId)
      .filter((id): id is number => id != null)
      .map(id => Number(id));

    // Batch-load students with group and payment info
    const studentsMap = new Map<number, any>();
    if (targetStudentIds.length > 0) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const students = await this.studentModel.findAll({
        where: { id: [...new Set(targetStudentIds)] },
        attributes: ['id', 'first_name', 'last_name'],
      });

      const groupRelations = await this.groupStudentModel.findAll({
        where: { student_id: [...new Set(targetStudentIds)] },
        include: [{ model: GroupModel, as: 'group', attributes: ['id', 'name', 'monthly_price'] }],
      });

      const payments = await this.paymentModel.findAll({
        where: { month, year, student_id: [...new Set(targetStudentIds)] },
      });

      for (const s of students) {
        const sid = Number(s.id);
        const rel = groupRelations.find(r => Number(r.student_id) === sid);
        const payment = payments.find(p => Number(p.student_id) === sid);
        const group = rel?.group as any;
        const monthlyPrice = Number(group?.monthly_price) || 0;
        const paidAmount = payment ? Number(payment.amount) : 0;
        const debt = Math.max(0, monthlyPrice - paidAmount);

        studentsMap.set(sid, {
          first_name: s.first_name,
          last_name: s.last_name,
          group_name: group?.name || '',
          summa: String(Math.floor(debt)),
          oy: MONTH_NAMES_UZ[month] || `${month}`,
        });
      }
    }

    for (const t of targets) {
      let title = dto.title;
      let description = dto.description || null;

      // If using a template, override title and description from template
      if (template) {
        title = template.title;
        description = template.description || null;
      }

      // Replace placeholders if we have student data
      const studentData = t.studentId ? studentsMap.get(Number(t.studentId)) : null;
      if (studentData) {
        title = this.replacePlaceholders(title, studentData);
        if (description) {
          description = this.replacePlaceholders(description, studentData);
        }
      }

      const notif = await this.notificationModel.create({
        user_id: t.userId ? Number(t.userId) : null,
        role: t.role,
        student_id: t.studentId ? Number(t.studentId) : null,
        teacher_id: t.teacherId ? Number(t.teacherId) : null,
        title,
        description,
        link: dto.link || null,
        image: imagePath || null,
        is_read: false,
        sender_type: senderType,
        sender_id: senderId ? Number(senderId) : null,
        center_id: centerId ? Number(centerId) : null,
      });

      const payload = {
        id: notif.id,
        title: notif.title,
        description: notif.description,
        link: notif.link,
        image: notif.image,
        createdAt: notif.createdAt,
        is_read: false,
        sender_type: senderType,
      };

      if (t.userId) this.gateway.sendToUser(t.userId, payload);
      if (t.role) this.gateway.sendToRole(t.role, payload);

      created.push(notif);
    }

    // Also send to center room if center_id is set
    if (centerId && created.length > 0) {
      const payload = {
        count: created.length,
        title: created[0].title,
      };
      this.gateway.sendToCenter(centerId, payload);
    }

    return { success: true, count: created.length, notifications: created };
  }

  private replacePlaceholders(text: string, data: Record<string, string>): string {
    return text
      .replace(/\{ism\}/gi, data.first_name || '')
      .replace(/\{familiya\}/gi, data.last_name || '')
      .replace(/\{guruh\}/gi, data.group_name || '')
      .replace(/\{summa\}/gi, data.summa || '0')
      .replace(/\{oy\}/gi, data.oy || '');
  }

  private async resolveTargets(dto: CreateNotificationDto): Promise<Array<{ userId?: number; role?: string; studentId?: number; teacherId?: number }>> {
    const targets: Array<{ userId?: number; role?: string; studentId?: number; teacherId?: number }> = [];

    if (dto.student_id) {
      const sid = Number(dto.student_id);
      targets.push({ userId: sid, role: 'student', studentId: sid });
    }

    if (dto.teacher_id) {
      const tid = Number(dto.teacher_id);
      targets.push({ userId: tid, role: 'teacher', teacherId: tid });
    }

    if (dto.student_ids?.length) {
      for (const sid of dto.student_ids) {
        const nid = Number(sid);
        targets.push({ userId: nid, role: 'student', studentId: nid });
      }
    }

    if (dto.teacher_ids?.length) {
      for (const tid of dto.teacher_ids) {
        const nid = Number(tid);
        targets.push({ userId: nid, role: 'teacher', teacherId: nid });
      }
    }

    if (dto.group_id) {
      const groupStudents = await this.groupStudentModel.findAll({
        where: { group_id: Number(dto.group_id) },
        attributes: ['student_id'],
      });
      for (const gs of groupStudents) {
        targets.push({ userId: Number(gs.student_id), role: 'student', studentId: Number(gs.student_id) });
      }
    }

    if (dto.group_ids?.length) {
      const groupStudentWhere = { [Op.in]: dto.group_ids.map((id: any) => Number(id)) };
      const groupStudents = await this.groupStudentModel.findAll({
        where: { group_id: groupStudentWhere },
        attributes: ['student_id'],
      });
      const seen = new Set<number>();
      for (const gs of groupStudents) {
        const sid = Number(gs.student_id);
        if (!seen.has(sid)) {
          seen.add(sid);
          targets.push({ userId: sid, role: 'student', studentId: sid });
        }
      }
    }

    if (dto.send_to_all_students) {
      const where: any = {};
      if (dto.center_id) where.center_id = dto.center_id;
      const students = await this.studentModel.findAll({ where, attributes: ['id'] });
      const existingIds = new Set(targets.map(t => t.studentId).filter(Boolean));
      for (const s of students) {
        const sid = Number(s.id);
        if (!existingIds.has(sid)) {
          targets.push({ userId: sid, role: 'student', studentId: sid });
        }
      }
    }

    if (dto.send_to_all_teachers) {
      const where: any = {};
      if (dto.center_id) where.center_id = dto.center_id;
      const teachers = await this.teacherModel.findAll({ where, attributes: ['id'] });
      const existingIds = new Set(targets.map(t => t.teacherId).filter(Boolean));
      for (const t of teachers) {
        const tid = Number(t.id);
        if (!existingIds.has(tid)) {
          targets.push({ userId: tid, role: 'teacher', teacherId: tid });
        }
      }
    }

    if (dto.role && targets.length === 0) {
      targets.push({ role: dto.role });
    }

    if (dto.userId && targets.length === 0) {
      targets.push({ userId: Number(dto.userId) });
    }

    const unique = new Map<number, typeof targets[0]>();
    for (const t of targets) {
      if (t.userId) {
        const key = Number(t.userId);
        if (!unique.has(key)) unique.set(key, t);
      } else {
        unique.set(targets.length + Math.random(), t);
      }
    }

    return Array.from(unique.values());
  }

  // ============= History =============

  async findAll(center_id?: number, page = 1, limit = 20) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    const offset = (page - 1) * limit;
    const { count, rows } = await this.notificationModel.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        { model: StudentModel, attributes: ['id', 'first_name', 'last_name', 'phone_number'], required: false },
        { model: TeacherModel, attributes: ['id', 'first_name', 'last_name', 'phone_number'], required: false },
      ],
    });
    return { data: rows, total: count, page, limit, total_pages: Math.ceil(count / limit) };
  }

  async findUserNotifications(userId: number, role?: string, page = 1, limit = 20) {
    const where: any = {
      [Op.or]: [
        { user_id: userId },
        ...(role ? [{ role }] : []),
        ...(!role ? [{ role: 'all' }] : []),
      ],
    };

    if (role === 'student') where.student_id = userId;
    if (role === 'teacher') where.teacher_id = userId;

    const offset = (page - 1) * limit;
    const { count, rows } = await this.notificationModel.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
    return { data: rows, total: count, page, limit, total_pages: Math.ceil(count / limit) };
  }

  async getUnreadCount(userId: number, role?: string) {
    const where: any = {
      is_read: false,
      [Op.or]: [
        { user_id: userId },
        ...(role ? [{ role }] : []),
      ],
    };
    if (role === 'student') where.student_id = userId;
    if (role === 'teacher') where.teacher_id = userId;
    return this.notificationModel.count({ where });
  }

  async markAsRead(id: number) {
    const notif = await this.notificationModel.findByPk(id);
    if (!notif) throw new NotFoundException('Notification not found');
    await notif.update({ is_read: true });
    return notif;
  }

  async markAllAsRead(userId: number, role?: string) {
    const where: any = {
      is_read: false,
      [Op.or]: [
        { user_id: userId },
        ...(role ? [{ role }] : []),
      ],
    };
    if (role === 'student') where.student_id = userId;
    if (role === 'teacher') where.teacher_id = userId;
    await this.notificationModel.update({ is_read: true }, { where });
    return { success: true };
  }

  async findOne(id: number) {
    const notif = await this.notificationModel.findByPk(id);
    if (!notif) throw new NotFoundException('Notification not found');
    return notif;
  }

  async remove(id: number) {
    const notif = await this.findOne(id);
    await notif.destroy();
    return { success: true };
  }

  // ============= Templates =============

  async createTemplate(dto: CreateTemplateDto) {
    return this.templateModel.create({ ...dto });
  }

  async findAllTemplates(center_id?: number) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    return this.templateModel.findAll({ where, order: [['createdAt', 'DESC']] });
  }

  async updateTemplate(id: number, dto: Partial<CreateTemplateDto>) {
    const tmpl = await this.templateModel.findByPk(id);
    if (!tmpl) throw new NotFoundException('Template not found');
    await tmpl.update(dto);
    return tmpl;
  }

  async deleteTemplate(id: number) {
    const tmpl = await this.templateModel.findByPk(id);
    if (!tmpl) throw new NotFoundException('Template not found');
    await tmpl.destroy();
    return { success: true };
  }

  // ============= Payment Reminders (with templates) =============

  async sendDailyPaymentReminders(center_id?: number) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Find a payment reminder template for this center (or global)
    const templateWhere: any = { category: 'payment' };
    if (center_id) templateWhere.center_id = center_id;
    let template = await this.templateModel.findOne({ where: templateWhere });
    if (!template && center_id) {
      template = await this.templateModel.findOne({ where: { category: 'payment', center_id: null } });
    }
    if (!template) {
      template = await this.templateModel.findOne({ where: { category: 'payment' } });
    }

    const groupWhere: any = { monthly_price: { [Op.gt]: 0 } };
    if (center_id) groupWhere.center_id = center_id;
    const groups = await this.groupModel.findAll({ where: groupWhere, attributes: ['id'] });
    const groupIds = groups.map(g => g.id);

    if (groupIds.length === 0) return { sent: 0, reason: 'No groups with monthly price' };

    const unpaidPayments = await this.paymentModel.findAll({
      where: { month, year, status: { [Op.ne]: 'paid' }, group_id: groupIds },
      include: [
        { model: StudentModel, attributes: ['id', 'first_name', 'last_name'] },
        { model: GroupModel, attributes: ['id', 'name'] },
      ],
    });

    let sent = 0;
    for (const payment of unpaidPayments) {
      const student = payment.student as any;
      const group = payment.group as any;
      if (!student) continue;

      const monthlyPrice = Number((group as any)?.monthly_price) || 0;
      const paidAmount = Number(payment.amount) || 0;
      const debt = Math.max(0, monthlyPrice - paidAmount);

      const placeholders = {
        first_name: student.first_name,
        last_name: student.last_name,
        group_name: group?.name || '',
        summa: String(Math.floor(debt)),
        oy: MONTH_NAMES_UZ[month] || `${month}`,
      };

      let title = template ? template.title : "To'lov eslatmasi";
      let description = template
        ? (template.description || '')
        : `Hurmatli ${student.first_name}, ${MONTH_NAMES_UZ[month]} oyi uchun to'lov muddati o'tgan. Iltimos, to'lovni amalga oshiring!`;

      title = this.replacePlaceholders(title, placeholders);
      description = this.replacePlaceholders(description, placeholders);

      await this.notificationModel.create({
        user_id: Number(student.id),
        role: 'student',
        student_id: Number(student.id),
        title,
        description,
        link: '/payments',
        is_read: false,
        sender_type: 'system',
        center_id: center_id || null,
      });

      sent++;
    }

    return { sent, month, year, total_unpaid: unpaidPayments.length };
  }
}
