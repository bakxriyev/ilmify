import { Injectable, NotFoundException, ConflictException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { EducationCenterModel } from './entities/education-center.entity';
import { CenterBranchModel } from './entities/center-branch.entity';
import { TariffModel } from '../tariffs/entities/tariff.entity';
import { TariffService } from '../tariffs/tariff.service';
import { AdminModel } from '../admin/model/admin.entity';
import { StudentModel } from '../students/model/student.entity';
import { TeacherModel } from '../teachers/model/teacher.model';
import { ParentModel } from '../parents/entities/parent.entity';
import { GroupModel } from '../groups/model/group.entity';
import { CreateEducationCenterDto } from './dto/create-education-center.dto';
import { UpdateEducationCenterDto } from './dto/update-education-center.dto';
import * as bcrypt from 'bcrypt';
import { Op } from 'sequelize';

@Injectable()
export class EducationCenterService implements OnModuleInit {
  constructor(
    @InjectModel(EducationCenterModel) private centerModel: typeof EducationCenterModel,
    @InjectModel(CenterBranchModel) private branchModel: typeof CenterBranchModel,
    @InjectModel(TariffModel) private tariffModel: typeof TariffModel,
    private tariffService: TariffService,
    @InjectModel(AdminModel) private adminModel: typeof AdminModel,
    @InjectModel(StudentModel) private studentModel: typeof StudentModel,
    @InjectModel(TeacherModel) private teacherModel: typeof TeacherModel,
    @InjectModel(ParentModel) private parentModel: typeof ParentModel,
    @InjectModel(GroupModel) private groupModel: typeof GroupModel,
  ) {}

  async onModuleInit() {
    const centers = await this.centerModel.findAll({ where: { public_lead_token: null } });
    for (const center of centers) {
      const crypto = await import('crypto');
      center.public_lead_token = crypto.randomUUID();
      await center.save();
    }
    if (centers.length > 0) {
      console.log(`${centers.length} ta markazga public_lead_token yaratildi`);
    }
  }

  // Har kuni 00:00 da muddati o'tgan markazlarni inactive qilish
  @Cron('0 0 * * *')
  async deactivateExpiredCenters() {
    const now = new Date();
    const expired = await this.centerModel.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { trial_ends_at: { [Op.ne]: null, [Op.lte]: now }, tariff_id: null },
          { tariff_ends_at: { [Op.ne]: null, [Op.lte]: now } },
        ],
      },
    });
    for (const c of expired) {
      await c.update({ is_active: false });
    }
    if (expired.length > 0) {
      console.log(`${expired.length} ta markaz muddati tugagani uchun bloklandi`);
    }
  }

  async create(dto: CreateEducationCenterDto) {
    const existing = await this.centerModel.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Bunday nomli markaz mavjud');

    let tariff: TariffModel | null = null;
    let tariff_price = 0;
    let tariff_ends_at: Date | null = null;
    const now = new Date();

    if (dto.tariff_id) {
      tariff = await this.tariffModel.findByPk(dto.tariff_id);
      if (!tariff) throw new NotFoundException('Tarif topilmadi');
      const months = dto.tariff_duration || 1;
      tariff_price = this.tariffService.calculatePrice(tariff, months);
      tariff_ends_at = new Date(now);
      tariff_ends_at.setMonth(tariff_ends_at.getMonth() + months);
    }

    // BETA: 7 kunlik trial
    const trial_ends_at = new Date();
    trial_ends_at.setDate(trial_ends_at.getDate() + 7);

    const center = await this.centerModel.create({
      name: dto.name,
      location: dto.location,
      phone: dto.phone,
      is_active: dto.is_active ?? true,
      tariff_id: tariff?.id || null,
      tariff_duration: dto.tariff_duration || null,
      tariff_price: tariff_price > 0 ? tariff_price : null,
      tariff_started_at: tariff ? now : null,
      tariff_ends_at,
      trial_ends_at,
      call_center_enabled: false,
      features: {},
    });

    if (dto.admin) {
      const hashed = await bcrypt.hash(dto.admin.password, 10);
      await this.adminModel.create({
        full_name: `${dto.admin.first_name} ${dto.admin.last_name}`,
        email: dto.admin.email,
        phone_number: dto.admin.phone_number,
        password: hashed,
        role: 'director',
        center_id: center.id,
      });
    }

    return this.findOne(center.id);
  }

  async update(id: number, dto: UpdateEducationCenterDto) {
    const center = await this.centerModel.findByPk(id);
    if (!center) throw new NotFoundException('Markaz topilmadi');

    const updateData: any = { ...dto };

    // Agar tariff o'zgartirilsa, narx va muddatni qayta hisoblash
    if (dto.tariff_id && dto.tariff_id !== center.tariff_id) {
      const tariff = await this.tariffModel.findByPk(dto.tariff_id);
      if (!tariff) throw new NotFoundException('Tarif topilmadi');
      const months = dto.tariff_duration || center.tariff_duration || 1;
      updateData.tariff_price = this.tariffService.calculatePrice(tariff, months);
      updateData.tariff_duration = months;
      updateData.tariff_started_at = new Date();
      const endsAt = new Date();
      endsAt.setMonth(endsAt.getMonth() + months);
      updateData.tariff_ends_at = endsAt;
      // Tarif tanlangan bo'lsa trial muddati kerak emas
      updateData.trial_ends_at = null;
    } else if (dto.tariff_duration && dto.tariff_duration !== center.tariff_duration) {
      // Faqat muddat o'zgartirilsa
      const tariff = await this.tariffModel.findByPk(center.tariff_id);
      if (tariff) {
        updateData.tariff_price = this.tariffService.calculatePrice(tariff, dto.tariff_duration);
        updateData.tariff_duration = dto.tariff_duration;
        const startsAt = center.tariff_started_at || new Date();
        const endsAt = new Date(startsAt);
        endsAt.setMonth(endsAt.getMonth() + dto.tariff_duration);
        updateData.tariff_ends_at = endsAt;
      }
    }

    await center.update(updateData);
    return this.findOne(id);
  }

  async findAll() {
    const centers = await this.centerModel.findAll({
      order: [['created_at', 'DESC']],
      include: [
        { model: CenterBranchModel, as: 'branches' },
        { model: TariffModel },
      ],
    });

    const result = [];
    for (const c of centers) {
      const [students, teachers, groups] = await Promise.all([
        this.studentModel.count({ where: { center_id: c.id } }),
        this.teacherModel.count({ where: { center_id: c.id } }),
        this.groupModel.count({ where: { center_id: c.id } }),
      ]);
      result.push({
        ...c.toJSON(),
        student_count: students,
        teacher_count: teachers,
        group_count: groups,
      });
    }
    return result;
  }

  async findOne(id: number) {
    const center = await this.centerModel.findByPk(id, {
      include: [
        { model: CenterBranchModel, as: 'branches' },
        { model: TariffModel },
      ],
    });
    if (!center) throw new NotFoundException('Markaz topilmadi');

    const [students, teachers, groups, admins] = await Promise.all([
      this.studentModel.count({ where: { center_id: id } }),
      this.teacherModel.count({ where: { center_id: id } }),
      this.groupModel.count({ where: { center_id: id } }),
      this.adminModel.count({ where: { center_id: id } }),
    ]);

    return { ...center.toJSON(), student_count: students, teacher_count: teachers, group_count: groups, admin_count: admins };
  }

  async findByToken(token: string) {
    const center = await this.centerModel.findOne({
      where: { public_lead_token: token, is_active: true },
      attributes: ['id', 'name', 'public_lead_token'],
    });
    if (!center) throw new NotFoundException('Markaz topilmadi yoki bloklangan');
    return center;
  }

  async remove(id: number) {
    const center = await this.findOne(id);
    await center.destroy();
    return { message: 'Markaz o\'chirildi' };
  }

  async getStats() {
    const [centers, totalStudents, totalTeachers, totalParents, totalGroups] = await Promise.all([
      this.centerModel.findAll({ include: [{ model: TariffModel }] }),
      this.studentModel.count(),
      this.teacherModel.count(),
      this.parentModel.count(),
      this.groupModel.count(),
    ]);

    const total = centers.length;
    const active = centers.filter(c => c.is_active).length;
    const totalBalance = centers.reduce((s, c) => s + Number(c.balance || 0), 0);

    const centerStats = await Promise.all(centers.map(async (c) => {
      const [s, t, g] = await Promise.all([
        this.studentModel.count({ where: { center_id: c.id } }),
        this.teacherModel.count({ where: { center_id: c.id } }),
        this.groupModel.count({ where: { center_id: c.id } }),
      ]);
      return {
        id: c.id, name: c.name, students: s, teachers: t, groups: g, is_active: c.is_active,
        tariff: c.tariff ? { id: c.tariff.id, name: c.tariff.name } : null,
        trial_ends_at: c.trial_ends_at,
        tariff_ends_at: c.tariff_ends_at,
      };
    }));

    return {
      total_centers: total,
      active_centers: active,
      total_balance: totalBalance,
      total_students: totalStudents,
      total_teachers: totalTeachers,
      total_parents: totalParents,
      total_groups: totalGroups,
      centers: centerStats,
    };
  }

  async addBranch(centerId: number, dto: { name: string; location?: string; phone?: string }) {
    await this.findOne(centerId);
    return this.branchModel.create({ center_id: centerId, ...dto });
  }

  async getBranches(centerId: number) {
    return this.branchModel.findAll({ where: { center_id: centerId } });
  }

  async removeBranch(branchId: number) {
    const branch = await this.branchModel.findByPk(branchId);
    if (!branch) throw new NotFoundException('Filial topilmadi');
    await branch.destroy();
    return { message: 'Filial o\'chirildi' };
  }

  async getOrCreatePublicToken(centerId: number): Promise<string> {
    const center = await this.centerModel.findByPk(centerId, { attributes: ['id', 'public_lead_token'] });
    if (!center) throw new NotFoundException('Markaz topilmadi');
    if (!center.public_lead_token) {
      const crypto = await import('crypto');
      center.public_lead_token = crypto.randomUUID();
      await center.save();
    }
    return center.public_lead_token;
  }

  async isCenterActive(centerId: number): Promise<boolean> {
    try {
      const center = await this.centerModel.findByPk(centerId, { attributes: ['is_active', 'trial_ends_at', 'tariff_ends_at'] });
      if (!center) return false;
      if (!center.is_active) return false;
      const now = new Date();
      if (center.trial_ends_at && now > center.trial_ends_at && !center.tariff_ends_at) return false;
      if (center.tariff_ends_at && now > center.tariff_ends_at) return false;
      return true;
    } catch {
      return true;
    }
  }

  async checkAndEnforceTrial(centerId: number): Promise<void> {
    const center = await this.centerModel.findByPk(centerId);
    if (!center) return;
    if (!center.is_active) return;
    const now = new Date();
    // Trial tugagan va tarif yo'q → bloklash
    if (center.trial_ends_at && now > center.trial_ends_at && !center.tariff_id) {
      await center.update({ is_active: false });
      return;
    }
    // Tarif muddati tugagan → bloklash
    if (center.tariff_ends_at && now > center.tariff_ends_at) {
      await center.update({ is_active: false });
    }
  }

  async getStudentLimit(centerId: number): Promise<number> {
    const center = await this.centerModel.findByPk(centerId, {
      include: [{ model: TariffModel }],
    });
    if (!center || !center.tariff) return 100;
    return center.tariff.student_max;
  }

  async updateLogo(id: number, filename: string | null) {
    const center = await this.centerModel.findByPk(id);
    if (!center) throw new NotFoundException('Markaz topilmadi');
    await center.update({ logo: filename });
    return this.findOne(id);
  }

  async checkStudentLimit(centerId: number): Promise<void> {
    const limit = await this.getStudentLimit(centerId);
    const count = await this.studentModel.count({ where: { center_id: centerId } });
    if (count >= limit) {
      throw new ForbiddenException(`Talabalar soni cheklangan (maks: ${limit})`);
    }
  }
}
