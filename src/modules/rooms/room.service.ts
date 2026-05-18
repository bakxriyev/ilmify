import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { RoomModel } from './entities/room.entity';
import { GroupLessonModel } from '../group-lesson/entities/group-lesson.entity';
import { GroupModel } from '../groups/model/group.entity';
import { GroupStudentModel } from '../group_student_model';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';

@Injectable()
export class RoomService {
  constructor(
    @InjectModel(RoomModel)
    private roomModel: typeof RoomModel,
    @InjectModel(GroupLessonModel)
    private groupLessonModel: typeof GroupLessonModel,
    @InjectModel(GroupStudentModel)
    private groupStudentModel: typeof GroupStudentModel,
  ) {}

  async findAll(search?: string, center_id?: number) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    if (search) where.name = { [Op.iLike]: `%${search}%` };
    const rooms = await this.roomModel.findAll({
      where,
      order: [['name', 'ASC']],
    });

    const result = [];
    for (const r of rooms) {
      // Find distinct groups that have lessons in this room
      const lessons = await this.groupLessonModel.findAll({
        where: { room_id: r.id },
        include: [{
          model: GroupModel,
          as: 'group',
          attributes: ['id', 'name'],
        }],
        order: [['date', 'DESC']],
      });

      const groupMap = new Map<number, { id: number; name: string; student_count: number; trial_count: number; lesson_times: string[] }>();
      for (const l of lessons) {
        if (!l.group) continue;
        if (!groupMap.has(l.group.id)) {
          const count = await this.groupStudentModel.count({ where: { group_id: l.group.id, is_trial: false } });
          const trialCount = await this.groupStudentModel.count({ where: { group_id: l.group.id, is_trial: true } });
          groupMap.set(l.group.id, { id: l.group.id, name: l.group.name, student_count: count, trial_count: trialCount, lesson_times: [] });
        }
        const timeStr = `${l.start_time?.slice(0, 5) || l.time?.slice(0, 5)}-${l.end_time?.slice(0, 5) || ''}`;
        if (!groupMap.get(l.group.id)!.lesson_times.includes(timeStr)) {
          groupMap.get(l.group.id)!.lesson_times.push(timeStr);
        }
      }

      const groupsWithCounts = [];
      let maxOccupied = 0;
      for (const [_, g] of groupMap) {
        const availSeats = r.capacity - g.student_count;
        if (g.student_count > maxOccupied) maxOccupied = g.student_count;
        groupsWithCounts.push({
          id: g.id,
          name: g.name,
          student_count: g.student_count,
          trial_count: g.trial_count,
          available_seats: availSeats >= 0 ? availSeats : 0,
          lesson_times: g.lesson_times,
        });
      }

      result.push({
        ...r.toJSON(),
        groups: groupsWithCounts,
        groups_count: groupsWithCounts.length,
        occupied_seats: maxOccupied,
        available_seats: r.capacity - maxOccupied,
      });
    }
    return result;
  }

  async findOne(id: number) {
    const room = await this.roomModel.findByPk(id);
    if (!room) throw new NotFoundException('Xona topilmadi');

    const json = room.toJSON() as any;

    // Get all lessons in this room with group info
    const lessons = await this.groupLessonModel.findAll({
      where: { room_id: id },
      include: [{
        model: GroupModel,
        as: 'group',
        attributes: ['id', 'name'],
      }],
      order: [['date', 'DESC']],
    });

    // Group lessons by group
    const groupMap = new Map<number, { id: number; name: string; lessons: any[] }>();
    for (const l of lessons) {
      if (!l.group) continue;
      if (!groupMap.has(l.group.id)) {
        groupMap.set(l.group.id, { id: l.group.id, name: l.group.name, lessons: [] });
      }
      const lessonJson = l.toJSON();
      delete lessonJson.group;
      groupMap.get(l.group.id)!.lessons.push(lessonJson);
    }

    const groupsWithDetails = [];
    for (const [groupId, g] of groupMap) {
      const count = await this.groupStudentModel.count({ where: { group_id: groupId, is_trial: false } });
      const trialCount = await this.groupStudentModel.count({ where: { group_id: groupId, is_trial: true } });
      const sortedLessons = g.lessons.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const nextLesson = sortedLessons.find((l: any) => new Date(l.date) >= new Date());

      groupsWithDetails.push({
        id: g.id,
        name: g.name,
        student_count: count,
        trial_count: trialCount,
        available_seats: json.capacity - count >= 0 ? json.capacity - count : 0,
        lessons_count: g.lessons.length,
        next_lesson_date: nextLesson?.date || null,
        next_lesson_time: nextLesson?.start_time?.slice(0, 5) || nextLesson?.time?.slice(0, 5) || null,
        next_lesson_end_time: nextLesson?.end_time?.slice(0, 5) || null,
        lessons: g.lessons,
      });
    }

    return {
      ...json,
      groups: groupsWithDetails,
      groups_count: groupsWithDetails.length,
    };
  }

  async create(dto: CreateRoomDto, center_id?: number) {
    const existing = await this.roomModel.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Bu nomli xona allaqachon mavjud');
    return this.roomModel.create({ ...dto, center_id: center_id || null });
  }

  async update(id: number, dto: UpdateRoomDto) {
    const room = await this.roomModel.findByPk(id);
    if (!room) throw new NotFoundException('Xona topilmadi');
    if (dto.name && dto.name !== room.name) {
      const existing = await this.roomModel.findOne({ where: { name: dto.name, id: { [Op.ne]: id } } });
      if (existing) throw new ConflictException('Bu nomli xona allaqachon mavjud');
    }
    await room.update(dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const room = await this.roomModel.findByPk(id);
    if (!room) throw new NotFoundException('Xona topilmadi');
    await room.destroy();
    return { message: 'Xona ochirildi' };
  }
}
