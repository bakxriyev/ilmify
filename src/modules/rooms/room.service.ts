import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { RoomModel } from './entities/room.entity';
import { GroupModel } from '../groups/model/group.entity';
import { GroupStudentModel } from '../group_student_model';
import { GroupLessonModel } from '../group-lesson/entities/group-lesson.entity';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';

@Injectable()
export class RoomService {
  constructor(
    @InjectModel(RoomModel)
    private roomModel: typeof RoomModel,
    @InjectModel(GroupStudentModel)
    private groupStudentModel: typeof GroupStudentModel,
  ) {}

  async findAll(search?: string, center_id?: number) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    if (search) where.name = { [Op.iLike]: `%${search}%` };
    const rooms = await this.roomModel.findAll({
      where,
      include: [{ model: GroupModel, as: 'groups', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']],
    });

    const result = [];
    for (const r of rooms) {
      const groupsWithCounts = [];
      for (const g of r.groups || []) {
        const count = await this.groupStudentModel.count({ where: { group_id: g.id } });
        groupsWithCounts.push({ id: g.id, name: g.name, student_count: count });
      }
      const totalOccupied = groupsWithCounts.reduce((s, g) => s + g.student_count, 0);
      result.push({
        ...r.toJSON(),
        groups: groupsWithCounts,
        groups_count: groupsWithCounts.length,
        occupied_seats: totalOccupied,
        available_seats: r.capacity - totalOccupied,
      });
    }
    return result;
  }

  async findOne(id: number) {
    const room = await this.roomModel.findByPk(id, {
      include: [{
        model: GroupModel,
        as: 'groups',
        include: [{ model: GroupLessonModel, as: 'lessons', attributes: ['id', 'date', 'time', 'parity'] }],
      }],
    });
    if (!room) throw new NotFoundException('Xona topilmadi');

    const json = room.toJSON() as any;
    const groupsWithDetails = [];
    for (const g of json.groups || []) {
      const count = await this.groupStudentModel.count({ where: { group_id: g.id } });
      const lessons = (g.lessons || []).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const nextLesson = lessons.find((l: any) => new Date(l.date) >= new Date());
      groupsWithDetails.push({
        id: g.id,
        name: g.name,
        student_count: count,
        available_seats: json.capacity - count,
        lessons_count: lessons.length,
        next_lesson_date: nextLesson?.date || null,
        next_lesson_time: nextLesson?.time?.slice(0, 5) || null,
        lessons,
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
    const room = await this.findOne(id);
    if (dto.name && dto.name !== room.name) {
      const existing = await this.roomModel.findOne({ where: { name: dto.name, id: { [Op.ne]: id } } });
      if (existing) throw new ConflictException('Bu nomli xona allaqachon mavjud');
    }
    await room.update(dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const room = await this.findOne(id);
    await room.destroy();
    return { message: 'Xona ochirildi' };
  }
}
