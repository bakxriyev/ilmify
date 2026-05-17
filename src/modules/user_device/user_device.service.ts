import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserDeviceModel } from './entities/user_device.entity';
import { Op } from 'sequelize';

@Injectable()
export class UserDeviceService {
  constructor(
    @InjectModel(UserDeviceModel)
    private userDeviceModel: typeof UserDeviceModel,
  ) {}

  /**
   * Barcha faol sessiyalarni olish (admin uchun)
   */
  async findAll(query: {
    page?: number;
    limit?: number;
    user_type?: 'student' | 'teacher';
    user_id?: number;
    is_active?: boolean;
  }) {
    const { page = 1, limit = 20, user_type, user_id, is_active } = query;
    const offset = (page - 1) * limit;
    const where: any = {};

    if (user_type) where.user_type = user_type;
    if (user_id) where.user_id = user_id;
    if (is_active !== undefined) where.is_active = is_active;

    const { count, rows } = await this.userDeviceModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [['last_active', 'DESC']],
      include: ['student', 'teacher'],
    });

    return {
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Bitta sessiyani olish
   */
  async findOne(id: number) {
    const device = await this.userDeviceModel.findByPk(id, {
      include: ['student', 'teacher'],
    });

    if (!device) {
      throw new NotFoundException(`Device #${id} topilmadi`);
    }

    return device;
  }

  /**
   * User bo'yicha faol sessiyalarni olish
   */
  async findByUser(userType: 'student' | 'teacher', userId: number) {
    return this.userDeviceModel.findAll({
      where: {
        user_type: userType,
        user_id: userId,
        is_active: true,
      },
      order: [['last_active', 'DESC']],
    });
  }

  /**
   * Sessiyani yaratish
   */
  async create(data: {
    user_type: 'student' | 'teacher';
    user_id: number;
    student_id?: number;
    teacher_id?: number;
    device_id: string;
    device_info?: string;
    ip_address?: string;
    jti: string;
  }) {
    return this.userDeviceModel.create({
      ...data,
      last_active: new Date(),
      is_active: true,
    });
  }

  /**
   * Sessiyani yangilash (last_active)
   */
  async updateLastActive(id: number) {
    const device = await this.findOne(id);
    device.last_active = new Date();
    await device.save();
    return device;
  }

  /**
   * Sessiyani deaktiv qilish
   */
  async deactivate(id: number) {
    const device = await this.findOne(id);
    device.is_active = false;
    await device.save();
    return { message: 'Sessiya deaktiv qilindi', id };
  }

  /**
   * JTI bo'yicha sessiyani deaktiv qilish
   */
  async deactivateByJti(jti: string) {
    await this.userDeviceModel.update(
      { is_active: false },
      { where: { jti, is_active: true } }
    );
    return { message: 'Sessiya deaktiv qilindi', jti };
  }

  /**
   * User ning barcha sessiyalarini deaktiv qilish
   */
  async deactivateAllByUser(userType: 'student' | 'teacher', userId: number) {
    await this.userDeviceModel.update(
      { is_active: false },
      {
        where: {
          user_type: userType,
          user_id: userId,
          is_active: true,
        },
      }
    );
    return { message: 'Barcha sessiyalar deaktiv qilindi', userId };
  }

  /**
   * Eski sessiyalarni o'chirish (30 kundan eski)
   */
  async cleanupOldSessions(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deleted = await this.userDeviceModel.destroy({
      where: {
        is_active: false,
        last_active: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    return { message: `${deleted} ta eski sessiya o'chirildi`, count: deleted };
  }

  /**
   * Sessiyani to'liq o'chirish
   */
  async delete(id: number) {
    const device = await this.findOne(id);
    await device.destroy();
    return { message: 'Sessiya o\'chirildi', id };
  }

  /**
   * Statistika
   */
  async getStats() {
    const totalActive = await this.userDeviceModel.count({
      where: { is_active: true },
    });

    const activeStudents = await this.userDeviceModel.count({
      where: { user_type: 'student', is_active: true },
    });

    const activeTeachers = await this.userDeviceModel.count({
      where: { user_type: 'teacher', is_active: true },
    });

    const totalInactive = await this.userDeviceModel.count({
      where: { is_active: false },
    });

    return {
      total_active: totalActive,
      active_students: activeStudents,
      active_teachers: activeTeachers,
      total_inactive: totalInactive,
    };
  }
}