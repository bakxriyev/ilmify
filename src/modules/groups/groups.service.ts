import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { GroupModel } from './model/group.entity';
import { TeacherModel } from '../teachers/model/teacher.model';
import { LevelModel } from '../level/model/level.entity';
import { StudentModel } from '../students/model/student.entity';
import { GroupStudentModel } from 'src/modules/group_student_model';
import { CreateGroupDto, UpdateGroupDto } from './dto';
import { QueryGroupDto } from './dto/query-group.dto';
import { Op } from 'sequelize';
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

  // Guruhni yaratish
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
      createGroupDto.parity
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
  include: [
    ...includeArray,
    { model: GroupLessonModel, as: 'lessons' }
  ],
  limit,
  offset,
  order: [
    ['name', 'ASC'],
    [{ model: GroupLessonModel, as: 'lessons' }, 'date', 'ASC']
  ],
  distinct: true,
});

    const dataWithCounts = await Promise.all(rows.map(async (group) => {
      const studentCount = await this.groupStudentModel.count({ where: { group_id: group.id } });
      const g = group.toJSON() as any;
      g.student_count = studentCount;
      if (g.room) {
        g.room.available_seats = g.room.capacity - studentCount;
        g.room.occupied_seats = studentCount;
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
      include: [...includeArray, { model: RoomModel, as: 'room' }]});

    if (!group) {
      throw new NotFoundException(`ID=${id} bo'lgan guruh topilmadi`);
    }

    const studentCount = await this.groupStudentModel.count({ where: { group_id: group.id } });
    const g = group.toJSON() as any;
    g.student_count = studentCount;
    if (g.room) {
      g.room.available_seats = g.room.capacity - studentCount;
      g.room.occupied_seats = studentCount;
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

    // O'chirishdan oldin barcha bog'liq ma'lumotlarni tozalash
    // Attendance yozuvlarini o'chirish (CASCADE yo'q)
    await this.attendanceModel.destroy({ where: { group_id: groupId } });

    // Chat xonalarini o'chirish
    await this.chatRoomModel.destroy({ where: { group_id: groupId } });

    // Group studentlari CASCADE bo'yicha o'chadi
    // Group darslari CASCADE bo'yicha o'chadi
    // Groupning o'zini o'chirish (qolgan hamma narsa CASCADE orqali tozalanadi)
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

  async addStudentToGroup(groupId: number, studentId: number): Promise<GroupStudentModel> {
    await this.findOne(groupId); // Guruh borligini tekshirish

    // Student allaqachon guruhda emasligini tekshirish
    const existing = await this.groupStudentModel.findOne({
      where: { group_id: groupId, student_id: studentId },
    });

    if (existing) {
      throw new ConflictException('Student allaqachon guruhda');
    }

    return this.groupStudentModel.create({
      group_id: groupId,
      student_id: studentId,
      joined_date: new Date(),
    });
  }

  async removeStudentFromGroup(groupId: number, studentId: number): Promise<void> {
    const relation = await this.groupStudentModel.findOne({
      where: { group_id: groupId, student_id: studentId },
    });

    if (!relation) {
      throw new NotFoundException('Student guruhda topilmadi');
    }

    await relation.destroy();
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
      {model: GroupLessonModel, as: 'lessons'},
      {model: RoomModel, as: 'room'}
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
    attributes: ['id', 'date', 'time', 'parity'],
    order: [['date', 'ASC']],
  });
}

    if (items.some(item => ['room', 'rooms'].includes(item))) {
      arr.push({ model: RoomModel, as: 'room' });
    }

    return arr.length > 0 ? arr : defaultIncludes;
  }


  


async createLessons(
  groupId: number,
  startDate: string,
  durationMonths: number,
  time: string,
  parity: 'odd' | 'even' | 'both'
) {
  const lessons: any[] = [];
  const start = new Date(startDate);
  const endDate = new Date(start);
  endDate.setMonth(endDate.getMonth() + durationMonths);

  // parity "odd" -> Dushanba, Chorshanba, Juma (1,3,5)
  // parity "even" -> Seshanba, Payshanba, Shanba (2,4,6)
  const selectedDays = parity === 'odd' ? [1, 3, 5] : [2, 4, 6];

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
        parity: parity,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  if (lessons.length) {
    await this.groupLessonModel.bulkCreate(lessons);
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