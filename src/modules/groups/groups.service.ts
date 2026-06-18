import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { GroupModel } from './model/group.entity';
import { TeacherModel } from '../teachers/model/teacher.model';
import { LevelModel } from '../level/model/level.entity';
import { GroupStudentModel } from 'src/modules/group_student_model';
import { StudentModel } from '../students/model/student.entity';
import { CreateGroupDto, UpdateGroupDto } from './dto';
import { QueryGroupDto } from './dto/query-group.dto';
import { Op } from 'sequelize';
import * as dayjs from 'dayjs';
import { Sequelize } from 'sequelize-typescript';
import { GroupLessonModel } from '../group-lesson/entities/group-lesson.entity'
import { ChatRoomModel, ChatRoomType } from '../chat/entities/chat-room.entity';
import { RoomModel } from '../rooms/entities/room.entity';
import { AttendanceModel } from '../attendence/model/attendence.entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectModel(GroupModel)
    private readonly groupModel: typeof GroupModel,

    @InjectModel(GroupStudentModel)
    private readonly groupStudentModel: typeof GroupStudentModel,

    @InjectModel(TeacherModel)
    private readonly teacherModel: typeof TeacherModel,

    @InjectModel(LevelModel)
    private readonly levelModel: typeof LevelModel,
    
    @InjectModel(GroupLessonModel)
    private readonly groupLessonModel: typeof GroupLessonModel,
    
    @InjectModel(ChatRoomModel)
    private readonly chatRoomModel: typeof ChatRoomModel,

    @InjectModel(AttendanceModel)
    private readonly attendanceModel: typeof AttendanceModel,

    @InjectModel(RoomModel)
    private readonly roomModel: typeof RoomModel,

    @InjectConnection()
    private readonly sequelize: Sequelize,

  ) {}

async create(createGroupDto: CreateGroupDto, center_id?: number): Promise<GroupModel> {
  // Guruh nomini tekshirish
  const existingGroup = await this.groupModel.findOne({
    where: { name: createGroupDto.name },
  });
  if (existingGroup) {
    throw new ConflictException('Bunday nomli guruh allaqachon mavjud');
  }

  // Teacher tekshirish
  if (createGroupDto.teacher_id) {
    const teacher = await this.teacherModel.findByPk(createGroupDto.teacher_id);
    if (!teacher) throw new NotFoundException('Teacher topilmadi');
  }

  // Support teacher tekshirish
  if (createGroupDto.support_teacher_id) {
    const supportTeacher = await this.teacherModel.findByPk(createGroupDto.support_teacher_id);
    if (!supportTeacher) throw new NotFoundException('Support teacher topilmadi');
  }

  // Level tekshirish
  if (createGroupDto.level_id) {
    const level = await this.levelModel.findByPk(createGroupDto.level_id);
    if (!level) throw new NotFoundException('Level topilmadi');
  }

  // Guruhni yaratish (room_id bilan birga)
  const group = await this.groupModel.create({
    ...createGroupDto,
    center_id: center_id || null,
  } as any);

  // Chat xonalarini avtomatik yaratish (student va parent)
  for (const type of [ChatRoomType.STUDENT, ChatRoomType.PARENT]) {
    await this.chatRoomModel.findOrCreate({
      where: { group_id: group.id, type },
      defaults: { group_id: group.id, type },
    });
  }

  // Agar darslar uchun ma'lumotlar berilgan bo'lsa, darslarni yaratish
  if (createGroupDto.start_date && createGroupDto.duration_months && createGroupDto.time && createGroupDto.parity) {
    await this.createLessons(
      group.id,
      createGroupDto.start_date,
      createGroupDto.duration_months,
      createGroupDto.time,
      createGroupDto.parity,
      createGroupDto.room_id,
      createGroupDto.start_time,
      createGroupDto.end_time
    );
  }

  // Yaratilgan guruhni to'liq ma'lumotlar bilan qaytarish (lessons bilan)
  return this.findOne(group.id);
}



  async findAll(queryDto: QueryGroupDto, center_id?: number) {
    const { page = 1, limit = 10, teacher_id, support_teacher_id, name, include } = queryDto;
    const offset = (page - 1) * limit;

    const whereClause: any = {};
    if (center_id) whereClause.center_id = center_id;
    if (teacher_id) whereClause.teacher_id = teacher_id;
    if (support_teacher_id) whereClause.support_teacher_id = support_teacher_id;
    if (name) whereClause.name = { [Op.iLike]: `%${name}%` };

    const includeArray = this.buildInclude(include);

    const { count, rows } = await this.groupModel.findAndCountAll({
  where: whereClause,
  include: includeArray,
  limit,
  offset,
  order: [
    ['name', 'ASC'],
  ],
  distinct: true,
});

    const dataWithCounts = await Promise.all(rows.map(async (group) => {
      const studentCount = await this.groupStudentModel.count({ where: { group_id: group.id, is_trial: false } });
      const trialCount = await this.groupStudentModel.count({ where: { group_id: group.id, is_trial: true } });
      const g = group.toJSON() as any;
      g.student_count = studentCount;
      g.trial_count = trialCount;
      // Xonani guruhning o'zidan olamiz (room = BelongsTo relation)
      if (g.room) {
        g.room = {
          id: g.room.id,
          name: g.room.name,
          capacity: g.room.capacity,
          occupied_seats: studentCount,
          available_seats: g.room.capacity - studentCount,
        };
      }
      return g;
    }));

    return {
      data: dataWithCounts,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }


 async findOne(id: number, include?: string): Promise<any> {
    const includeArray = this.buildInclude(include);

    const group = await this.groupModel.findByPk(id, {
      include: includeArray});

    if (!group) {
      throw new NotFoundException(`ID=${id} bo'lgan guruh topilmadi`);
    }

    const studentCount = await this.groupStudentModel.count({ where: { group_id: group.id, is_trial: false } });
    const trialCount = await this.groupStudentModel.count({ where: { group_id: group.id, is_trial: true } });
    const g = group.toJSON() as any;
    g.student_count = studentCount;
    g.trial_count = trialCount;

    // Xonani guruhning o'zidan olamiz (room = BelongsTo relation)
    if (g.room) {
      g.room = {
        id: g.room.id,
        name: g.room.name,
        capacity: g.room.capacity,
        occupied_seats: studentCount,
        available_seats: g.room.capacity - studentCount,
      };
      g.room_id = String(g.room.id);
    }

    return g;
}


  async update(id: number, updateGroupDto: UpdateGroupDto): Promise<GroupModel> {
    const group = await this.groupModel.findByPk(id);
    if (!group) {
      throw new NotFoundException(`ID=${id} bo'lgan guruh topilmadi`);
    }

    // Guruh nomini tekshirish
    if (updateGroupDto.name && updateGroupDto.name !== group.name) {
      const existing = await this.groupModel.findOne({
        where: { name: updateGroupDto.name, id: { [Op.ne]: id } },
      });
      if (existing) {
        throw new ConflictException('Bunday nomli guruh allaqachon bor');
      }
    }

    // Teacher tekshirish
    if (updateGroupDto.teacher_id) {
      const teacher = await this.teacherModel.findByPk(updateGroupDto.teacher_id);
      if (!teacher) {
        throw new NotFoundException('Teacher topilmadi');
      }
    }

    // Support teacher tekshirish
    if (updateGroupDto.support_teacher_id) {
      const supportTeacher = await this.teacherModel.findByPk(updateGroupDto.support_teacher_id);
      if (!supportTeacher) {
        throw new NotFoundException('Support teacher topilmadi');
      }
    }

    // Level tekshirish
    if (updateGroupDto.level_id) {
      const level = await this.levelModel.findByPk(updateGroupDto.level_id);
      if (!level) {
        throw new NotFoundException('Level topilmadi');
      }
    }

    await group.update(updateGroupDto);
    return this.findOne(id);
  }

  async remove(groupId: number): Promise<void> {
    const group = await this.groupModel.findByPk(groupId);
    if (!group) throw new NotFoundException('Group not found');

    // Studentlarni guruhdan chiqazish (group_id = null)
    await this.sequelize.query(
      'UPDATE students SET group_id = NULL WHERE group_id = :groupId',
      { replacements: { groupId } },
    );

    // Paymentlarni guruhdan chiqazish (group_id = null) — to'lovlar saqlanib qoladi
    await this.sequelize.query(
      'ALTER TABLE payments ALTER COLUMN group_id DROP NOT NULL',
    );
    await this.sequelize.query(
      'UPDATE payments SET group_id = NULL WHERE group_id = :groupId',
      { replacements: { groupId } },
    );

    // Attendance yozuvlarini o'chirish
    await this.attendanceModel.destroy({ where: { group_id: groupId } });

    // Chat xonalarini o'chirish
    await this.chatRoomModel.destroy({ where: { group_id: groupId } });

    // Group studentlari (pivot) CASCADE bo'yicha o'chadi
    // Group darslari CASCADE bo'yicha o'chadi
    // Groupning o'zini o'chirish
    await group.destroy();
  }

  async getGroupStudents(groupId: number): Promise<StudentModel[]> {
    await this.findOne(groupId); // Guruh borligini tekshirish

    const relations = await this.groupStudentModel.findAll({
      where: { group_id: groupId },
      include: [{ model: StudentModel, as: 'student' }],
    });

    return relations.map(r => r.student).filter(Boolean) as StudentModel[];
  }

  async addStudentToGroup(groupId: number, studentId: number, joined_date?: string): Promise<GroupStudentModel> {
    await this.findOne(groupId); // Guruh borligini tekshirish

    // Student allaqachon guruhda faol ekanligini tekshirish
    const existing = await this.groupStudentModel.findOne({
      where: { group_id: groupId, student_id: studentId },
    });

    if (existing) {
      if (!existing.left_date) {
        throw new ConflictException('Student allaqachon guruhda');
      }
      // Oldin chiqib ketgan bo'lsa, qayta faollashtirish
      const joinDate = joined_date ? new Date(joined_date) : new Date();
      await existing.update({ joined_date: joinDate, left_date: null });
      await StudentModel.update({ group_id: groupId }, { where: { id: studentId } });
      return existing;
    }

    const result = await this.groupStudentModel.create({
      group_id: groupId,
      student_id: studentId,
      joined_date: joined_date ? new Date(joined_date) : new Date(),
    });

    await StudentModel.update({ group_id: groupId }, { where: { id: studentId } });

    return result;
  }

  async removeStudentFromGroup(groupId: number, studentId: number): Promise<void> {
    const relation = await this.groupStudentModel.findOne({
      where: { group_id: groupId, student_id: studentId },
    });

    if (!relation) {
      throw new NotFoundException('Student guruhda topilmadi');
    }

    await relation.destroy();
    await StudentModel.update({ group_id: null }, { where: { id: studentId } });
  }

  private buildInclude(include?: string) {
    const defaultIncludes = [
      { model: TeacherModel, as: 'mainTeacher' },
      { model: TeacherModel, as: 'supportTeacher' },
      { 
        model: LevelModel, 
        as: 'level',
        attributes: ['id', 'name', 'title', 'description']
      },
      { model: RoomModel, as: 'room', attributes: ['id', 'name', 'capacity'] },
      {model: GroupLessonModel, as: 'lessons'},
    ];

    if (!include) {
      return defaultIncludes;
    }

    const items = include.split(',').map(i => i.trim());
    const arr: any[] = [];

    if (items.some(item => ['teacher', 'mainTeacher', 'teachers'].includes(item))) {
      arr.push({ model: TeacherModel, as: 'mainTeacher' });
    }

    if (items.some(item => ['supportTeacher', 'support'].includes(item))) {
      arr.push({ model: TeacherModel, as: 'supportTeacher' });
    }

    if (items.some(item => ['level', 'levels'].includes(item))) {
      arr.push({ 
        model: LevelModel, 
        as: 'level',
        attributes: ['id', 'name', 'title', 'description']
      });
    }

    if (items.some(item => ['students', 'groupStudents'].includes(item))) {
      arr.push({
        model: GroupStudentModel,
        as: 'groupStudents',
        include: [{ model: StudentModel, as: 'student' }],
      });
    }
    if (items.some(item => ['lessons', 'groupLessons'].includes(item))) {
      arr.push({
        model: GroupLessonModel,
        as: 'lessons',
        attributes: ['id', 'date', 'time', 'parity', 'start_time', 'end_time', 'room_id'],
        include: [{ model: RoomModel, as: 'room', attributes: ['id', 'name', 'capacity'] }],
        order: [['date', 'ASC']],
      });
    }

    if (items.some(item => ['room', 'rooms'].includes(item))) {
      arr.push({ model: RoomModel, as: 'room', attributes: ['id', 'name', 'capacity'] });
    }

    return arr.length > 0 ? arr : defaultIncludes;
  }


  


async generateLessons(
  groupId: number,
  startDate: string,
  durationMonths: number,
  time: string,
  parity: 'odd' | 'even' | 'both',
  room_id?: number,
  start_time?: string,
  end_time?: string,
) {
  const group = await this.groupModel.findByPk(groupId);
  if (!group) throw new NotFoundException('Guruh topilmadi');
  const lessons = await this.createLessons(groupId, startDate, durationMonths, time, parity, room_id, start_time, end_time);
  return { created: lessons.length };
}

async createLessons(
  groupId: number,
  startDate: string,
  durationMonths: number,
  time: string,
  parity: 'odd' | 'even' | 'both',
  room_id?: number,
  start_time?: string,
  end_time?: string,
) {
  const lessons: any[] = [];
  const start = new Date(startDate);
  const endDate = new Date(start);
  endDate.setMonth(endDate.getMonth() + durationMonths);

  // Kalendarda hafta Yakshanba bilan boshlanadi (1-kun)
  // dayjs().day() : 0=Yak, 1=Dush, 2=Sesh, 3=Chor, 4=Pay, 5=Juma, 6=Shanba
  //
  // Toq kunlar -> Dushanba(1), Chorshanba(3), Juma(5)
  // Juft kunlar -> Seshanba(2), Payshanba(4), Shanba(6)
  let selectedDays: number[];
  if (parity === 'odd') {
    selectedDays = [1, 3, 5];
  } else if (parity === 'even') {
    selectedDays = [2, 4, 6];
  } else {
    selectedDays = [1, 2, 3, 4, 5, 6];
  }

  let current = new Date(start);

  while (current <= endDate) {
    const jsDay = current.getDay();
    
    // Yakshanba skip
    if (jsDay === 0) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    // Agar kun tanlangan kunlardan biri bo'lsa - dars yaratamiz
    if (selectedDays.includes(jsDay)) {
      lessons.push({
        group_id: groupId,
        date: new Date(current),
        time,
        start_time: start_time || time,
        end_time: end_time || null,
        parity: parity,
        room_id: room_id || null,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  if (lessons.length) {
    await this.groupLessonModel.bulkCreate(lessons);
    // Agar groupda room_id yo'q bo'lsa, birinchi darsning xonasini groupga yozib qo'yamiz
    if (room_id) {
      const grp = await this.groupModel.findByPk(groupId);
      if (grp && !grp.room_id) {
        await grp.update({ room_id } as any);
      }
    }
  }

  return lessons;
}


}

function getISOWeekNumber(date: Date): number {
  // Nusxa yaratamiz (original sanani o'zgartirmaslik uchun)
  const target = new Date(date.valueOf());
  
  // ISO haftasi Dushanba bilan boshlanadi
  const dayNr = (target.getDay() + 6) % 7;
  
  // Joriy haftaning Payshanbasiga o'rnatamiz
  target.setDate(target.getDate() - dayNr + 3);
  
  // Yilning birinchi kunini olamiz
  const jan4 = new Date(target.getFullYear(), 0, 4);
  
  // Yilning birinchi Payshanbasini topamiz
  const jan4DayNr = (jan4.getDay() + 6) % 7;
  const firstThursday = new Date(jan4.valueOf());
  firstThursday.setDate(jan4.getDate() - jan4DayNr);
  
  // Hafta raqamini hisoblaymiz
  const weekDiff = (target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000);
  
  return 1 + Math.floor(weekDiff);
}