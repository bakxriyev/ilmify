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
    private gateway: NotificationGateway,
  ) {}

  async send(dto: CreateNotificationDto, imagePath?: string) {
    const targets = await this.resolveTargets(dto);
    if (targets.length === 0) throw new Error('Hech qanday qabul qiluvchi topilmadi');

    const created: NotificationModel[] = [];
    const senderType = dto.sender_type || 'admin';
    const senderId = dto.sender_id || null;

    for (const t of targets) {
      const notif = await this.notificationModel.create({
        user_id: t.userId,
        role: t.role,
        student_id: t.studentId || null,
        teacher_id: t.teacherId || null,
        title: dto.title,
        description: dto.description || null,
        link: dto.link || null,
        image: imagePath || null,
        is_read: false,
        sender_type: senderType,
        sender_id: senderId,
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

      // Realtime yuborish
      if (t.userId) this.gateway.sendToUser(t.userId, payload);
      if (t.role) this.gateway.sendToRole(t.role, payload);

      created.push(notif);
    }

    return { success: true, count: created.length, notifications: created };
  }

  private async resolveTargets(dto: CreateNotificationDto): Promise<Array<{ userId?: number; role?: string; studentId?: number; teacherId?: number }>> {
    const targets: Array<{ userId?: number; role?: string; studentId?: number; teacherId?: number }> = [];

    // Bitta student
    if (dto.student_id) {
      targets.push({ userId: dto.student_id, role: 'student', studentId: dto.student_id });
    }

    // Bitta teacher
    if (dto.teacher_id) {
      targets.push({ userId: dto.teacher_id, role: 'teacher', teacherId: dto.teacher_id });
    }

    // Bir nechta studentlar
    if (dto.student_ids?.length) {
      for (const sid of dto.student_ids) {
        targets.push({ userId: sid, role: 'student', studentId: sid });
      }
    }

    // Bir nechta teacherlar
    if (dto.teacher_ids?.length) {
      for (const tid of dto.teacher_ids) {
        targets.push({ userId: tid, role: 'teacher', teacherId: tid });
      }
    }

    // Guruh bo'yicha (bitta guruh)
    if (dto.group_id) {
      const groupStudents = await this.groupStudentModel.findAll({
        where: { group_id: dto.group_id },
        attributes: ['student_id'],
      });
      for (const gs of groupStudents) {
        targets.push({ userId: Number(gs.student_id), role: 'student', studentId: Number(gs.student_id) });
      }
    }

    // Bir nechta guruhlar
    if (dto.group_ids?.length) {
      const groupStudents = await this.groupStudentModel.findAll({
        where: { group_id: { [Op.in]: dto.group_ids } },
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

    // Barcha studentlar
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

    // Barcha teacherlar
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

    // Role orqali
    if (dto.role && targets.length === 0) {
      targets.push({ role: dto.role });
    }

    // Specific userId
    if (dto.userId && targets.length === 0) {
      targets.push({ userId: dto.userId });
    }

    // Remove duplicates by userId
    const unique = new Map<number, typeof targets[0]>();
    for (const t of targets) {
      if (t.userId) {
        const key = t.userId;
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

  async findAllTemplates() {
    return this.templateModel.findAll({ order: [['createdAt', 'DESC']] });
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
}
