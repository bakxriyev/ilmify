// src/modules/teachers/teacher.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import * as jwt from 'jsonwebtoken';
import { TeacherModel } from './model/teacher.model';
import { GroupModel } from '../groups/model/group.entity';
import { GroupStudentModel } from '../group_student_model';
import { RoomModel } from '../rooms/entities/room.entity';
import { UserDeviceModel } from '../user_device/entities/user_device.entity';
import { GroupLessonModel } from '../group-lesson/entities/group-lesson.entity';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';
import { CreateTeacherDto, UpdateTeacherDto, UpdateTeacherPasswordDto } from './dto';

@Injectable()
export class TeacherService {
  constructor(
    @InjectModel(TeacherModel)
    private teacherModel: typeof TeacherModel,
    @InjectModel(GroupStudentModel)
    private groupStudentModel: typeof GroupStudentModel,
  ) {}

  async findAll(params: {
    center_id?: number;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    first_name?: string;
    last_name?: string;
    gmail?: string;
    phone_number?: string;
    group_id?: number | 'notnull';
  } = {}) {
    const { center_id, page = 1, limit = 10, sort_by, sort_order, first_name, last_name, gmail, phone_number, group_id } = params;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (center_id) where.center_id = center_id;
    if (first_name) where.first_name = { [Op.iLike]: `%${first_name}%` };
    if (last_name) where.last_name = { [Op.iLike]: `%${last_name}%` };
    if (gmail) where.gmail = { [Op.iLike]: `%${gmail}%` };
    if (phone_number) where.phone_number = { [Op.iLike]: `%${phone_number}%` };

    // Sort
    const order: any[] = [];
    if (sort_by && ['id', 'first_name', 'last_name', 'gmail', 'phone_number', 'created_at'].includes(sort_by)) {
      order.push([sort_by, sort_order === 'asc' ? 'ASC' : 'DESC']);
    } else {
      order.push(['id', 'DESC']);
    }

    const include: any[] = [
      { model: GroupModel, as: 'mainGroups', required: false },
      { model: GroupModel, as: 'supportGroups', required: false },
    ];

    // group_id filter: 'notnull' = guruhi bor, 0 = guruhsiz
    if (group_id === 'notnull') {
      // Faqat kamida bitta guruhi bor teacherlar
      const teacherIdsWithGroups = await this.teacherModel.findAll({
        attributes: ['id'],
        include: [
          { model: GroupModel, as: 'mainGroups', attributes: [], required: true },
          { model: GroupModel, as: 'supportGroups', attributes: [], required: true },
        ],
        where: center_id ? { center_id } : undefined,
      });
      const ids = [...new Set(teacherIdsWithGroups.map(t => t.id))];
      if (ids.length === 0) {
        return {
          data: [],
          pagination: { total: 0, page, limit, totalPages: 0 },
        };
      }
      where.id = { [Op.in]: ids };
    } else if (group_id === 0) {
      // Faqat guruhi yo'q teacherlar
      const teacherIdsWithGroups = await this.teacherModel.findAll({
        attributes: ['id'],
        include: [
          { model: GroupModel, as: 'mainGroups', attributes: [], required: true },
          { model: GroupModel, as: 'supportGroups', attributes: [], required: true },
        ],
        where: center_id ? { center_id } : undefined,
      });
      const idsWithGroups = [...new Set(teacherIdsWithGroups.map(t => t.id))];
      if (idsWithGroups.length > 0) {
        where.id = { [Op.notIn]: idsWithGroups };
      }
    }

    const { count, rows } = await this.teacherModel.findAndCountAll({
      where,
      include,
      order,
      limit,
      offset,
      distinct: true,
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

  async findOne(id: number, includeGroups: boolean = false) {
    const include: any[] = [];
    if (includeGroups) {
      include.push(
        {
          model: GroupModel,
          as: 'mainGroups',
          include: [
            { model: RoomModel, as: 'room' },
            { model: GroupLessonModel, as: 'lessons', attributes: ['id', 'date', 'time', 'parity'] },
          ],
        },
        {
          model: GroupModel,
          as: 'supportGroups',
          include: [
            { model: RoomModel, as: 'room' },
            { model: GroupLessonModel, as: 'lessons', attributes: ['id', 'date', 'time', 'parity'] },
          ],
        },
      );
    }

    const teacher = await this.teacherModel.findByPk(id, { include });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${id} not found`);
    }

    const json = teacher.toJSON() as any;

    // Har bir guruh uchun student_count ni hisoblash
    if (includeGroups) {
      for (const g of json.mainGroups || []) {
        g.student_count = await this.groupStudentModel.count({ where: { group_id: g.id } });
        if (g.room) {
          g.room.occupied_seats = g.student_count;
          g.room.available_seats = g.room.capacity - g.student_count;
        }
      }
      for (const g of json.supportGroups || []) {
        g.student_count = await this.groupStudentModel.count({ where: { group_id: g.id } });
        if (g.room) {
          g.room.occupied_seats = g.student_count;
          g.room.available_seats = g.room.capacity - g.student_count;
        }
      }
    }

    return json;
  }

  async findByEmail(gmail: string) {
    return await this.teacherModel.findOne({ where: { gmail } });
  }

  async create(createTeacherDto: CreateTeacherDto, center_id?: number) {
    if (createTeacherDto.gmail) {
      const existingTeacher = await this.findByEmail(createTeacherDto.gmail);
      if (existingTeacher) {
        throw new ConflictException('Teacher with this email already exists');
      }
    }

    return await this.teacherModel.create({
      ...createTeacherDto,
      center_id: center_id || null,
    });
  }

  async update(id: number, updateTeacherDto: UpdateTeacherDto) {
    const teacher = await this.teacherModel.findByPk(id);
    if (!teacher) throw new NotFoundException('Teacher topilmadi');

    if (updateTeacherDto.gmail && updateTeacherDto.gmail !== teacher.gmail) {
      const existingTeacher = await this.findByEmail(updateTeacherDto.gmail);
      if (existingTeacher) {
        throw new ConflictException('Teacher with this email already exists');
      }
    }

    // password plain text saqlanadi

    await teacher.update(updateTeacherDto);
    return this.findOne(id);
  }

  async updatePassword(id: number, dto: UpdateTeacherPasswordDto) {
    const teacher = await this.teacherModel.findByPk(id);
    if (!teacher) throw new NotFoundException('Teacher topilmadi');
    teacher.password = dto.password;
    await teacher.save();
    return { message: 'Parol muvaffaqiyatli yangilandi' };
  }

  /**
   * Deletes a teacher after removing all associations:
   * - Sets teacher_id to NULL in groups where this teacher was the main teacher.
   * - Sets support_teacher_id to NULL in groups where this teacher was the support teacher.
   * Then deletes the teacher record.
   */
  async remove(id: number) {
    const teacher = await this.teacherModel.findByPk(id);
    if (!teacher) throw new NotFoundException(`Teacher with ID ${id} not found`);

    await GroupModel.update(
      { teacher_id: null },
      { where: { teacher_id: id } }
    );
    await GroupModel.update(
      { support_teacher_id: null },
      { where: { support_teacher_id: id } }
    );

    await teacher.destroy();

    return { message: `Teacher with ID ${id} has been deleted and removed from all groups` };
  }

  async getTeacherGroups(id: number) {
    const teacher = await this.findOne(id, true);

    const mainGroups = teacher.mainGroups || [];
    const supportGroups = teacher.supportGroups || [];

    return {
      teacher_id: id,
      teacher_name: `${teacher.first_name} ${teacher.last_name}`,
      teacher_type: teacher.teacher_type,
      main_groups: mainGroups,
      support_groups: supportGroups,
      total_groups: mainGroups.length + supportGroups.length,
    };
  }

  async validatePassword(gmail: string, password: string): Promise<boolean> {
    const teacher = await this.findByEmail(gmail);
    if (!teacher) return false;
    return teacher.password === password;
  }

  async login(phone_number: string, password: string) {
  const teacher = await this.teacherModel.findOne({
    where: { phone_number },
    include: [{ model: EducationCenterModel }],
  });

  if (!teacher) {
    throw new NotFoundException('Teacher not found');
  }

  const isMatch = teacher.password === password;

  if (!isMatch) {
    throw new ConflictException('Password incorrect');
  }

  const teacherJson = teacher.toJSON() as any;
  const center = teacherJson.center;

  const access_token = jwt.sign(
    {
      sub: teacher.id,
      id: teacher.id,
      type: 'teacher',
      phone_number: teacher.phone_number,
    },
    'secret123',
    { expiresIn: '7d' },
  );

  return {
    access_token,
    teacher: {
      id: teacher.id,
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      phone_number: teacher.phone_number,
      gmail: teacher.gmail,
      photo: teacher.photo,
      teacher_type: teacher.teacher_type,
      center_id: teacher.center_id,
      center: center ? {
        id: center.id,
        name: center.name,
        logo: center.logo,
        location: center.location,
        phone: center.phone,
        is_active: center.is_active,
      } : null,
    },
  };
}
}