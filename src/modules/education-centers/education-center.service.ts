import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { EducationCenterModel } from './entities/education-center.entity';
import { CenterBranchModel } from './entities/center-branch.entity';
import { AdminModel } from '../admin/model/admin.entity';
import { StudentModel } from '../students/model/student.entity';
import { TeacherModel } from '../teachers/model/teacher.model';
import { ParentModel } from '../parents/entities/parent.entity';
import { GroupModel } from '../groups/model/group.entity';
import { CreateEducationCenterDto } from './dto/create-education-center.dto';
import { UpdateEducationCenterDto } from './dto/update-education-center.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EducationCenterService {
  constructor(
    @InjectModel(EducationCenterModel) private centerModel: typeof EducationCenterModel,
    @InjectModel(CenterBranchModel) private branchModel: typeof CenterBranchModel,
    @InjectModel(AdminModel) private adminModel: typeof AdminModel,
    @InjectModel(StudentModel) private studentModel: typeof StudentModel,
    @InjectModel(TeacherModel) private teacherModel: typeof TeacherModel,
    @InjectModel(ParentModel) private parentModel: typeof ParentModel,
    @InjectModel(GroupModel) private groupModel: typeof GroupModel,
  ) {}

  async create(dto: CreateEducationCenterDto) {
    const existing = await this.centerModel.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Bunday nomli markaz mavjud');

    const center = await this.centerModel.create({
      name: dto.name,
      location: dto.location,
      phone: dto.phone,
      balance: dto.balance || 0,
      is_active: dto.is_active ?? true,
    });

    if (dto.admin) {
      const hashed = await bcrypt.hash(dto.admin.password, 10);
      await this.adminModel.create({
        full_name: `${dto.admin.first_name} ${dto.admin.last_name}`,
        email: dto.admin.email,
        phone_number: dto.admin.phone_number,
        password: hashed,
        role: 'admin',
        center_id: center.id,
      });
    }

    return this.findOne(center.id);
  }

  async findAll() {
    const centers = await this.centerModel.findAll({
      order: [['created_at', 'DESC']],
      include: [{ model: CenterBranchModel, as: 'branches' }],
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
      include: [{ model: CenterBranchModel, as: 'branches' }],
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

  async update(id: number, dto: UpdateEducationCenterDto) {
    const center = await this.centerModel.findByPk(id);
    if (!center) throw new NotFoundException('Markaz topilmadi');
    await center.update(dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const center = await this.findOne(id);
    await center.destroy();
    return { message: 'Markaz o\'chirildi' };
  }

  async getStats() {
    const [centers, totalStudents, totalTeachers, totalParents, totalGroups] = await Promise.all([
      this.centerModel.findAll(),
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
      return { id: c.id, name: c.name, students: s, teachers: t, groups: g, is_active: c.is_active };
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

  async isCenterActive(centerId: number): Promise<boolean> {
    try {
      const center = await this.centerModel.findByPk(centerId, { attributes: ['is_active'] });
      return center?.is_active === true;
    } catch {
      return true;
    }
  }
}
