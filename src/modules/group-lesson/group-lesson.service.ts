import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { GroupLessonModel } from './entities/group-lesson.entity';
import { GroupModel } from '../groups/model/group.entity';
import { UnitModel } from '../units/model';
import { RoomModel } from '../rooms/entities/room.entity';
import { AttendanceModel } from '../attendence/model/attendence.entity';

@Injectable()
export class GroupLessonService {
  constructor(
    @InjectModel(GroupLessonModel)
    private readonly lessonModel: typeof GroupLessonModel,

    @InjectModel(GroupModel)
    private readonly groupModel: typeof GroupModel,

    @InjectModel(UnitModel)
    private readonly unitModel: typeof UnitModel,

    @InjectModel(AttendanceModel)
    private readonly attendanceModel: typeof AttendanceModel,
  ) {}

  // GROUP lessons + units + room
  async findAllByGroup(groupId: number) {
    const group = await this.groupModel.findByPk(groupId);
    if (!group) throw new NotFoundException('Group topilmadi');

    return this.lessonModel.findAll({
      where: { group_id: groupId },
      include: [
        { model: UnitModel },
        { model: RoomModel, as: 'room' },
      ],
      order: [['date', 'ASC']],
    });
  }

  // Lesson yaratish
  async createLesson(
    groupId: number,
    unitId: number | null,
    date: Date,
    time: string,
    parity: 'odd' | 'even' | 'everyday',
    room_id?: number,
    start_time?: string,
    end_time?: string,
    weekdays?: 'mon-fri' | 'mon-sat',
  ) {
    const group = await this.groupModel.findByPk(groupId);
    if (!group) throw new NotFoundException('Group topilmadi');

    if (unitId) {
      const unit = await this.unitModel.findByPk(unitId);
      if (!unit) throw new NotFoundException('Unit topilmadi');
    }

    return this.lessonModel.create({
      group_id: groupId,
      unit_id: unitId || null,
      room_id: room_id || null,
      date,
      time,
      start_time: start_time || time,
      end_time: end_time || null,
      parity,
      weekdays: (parity === 'everyday' ? weekdays : null) || null,
    });
  }

  // SINGLE unit attach
  async attachUnitToLesson(lessonId: number, unitId: number) {
    const lesson = await this.lessonModel.findByPk(lessonId);
    if (!lesson) throw new NotFoundException('Lesson topilmadi');

    const unit = await this.unitModel.findByPk(unitId);
    if (!unit) throw new NotFoundException('Unit topilmadi');

    lesson.unit_id = unitId;
    await lesson.save();

    return {
      message: 'Unit lesson ga biriktirildi',
      lesson,
    };
  }

  // BULK attach
  async bulkAttachUnits(
    data: { lesson_id: number; unit_id: number }[],
  ) {
    if (!data.length) throw new BadRequestException('Data bo\'sh');

    const updatedLessons: GroupLessonModel[] = [];

    for (const item of data) {
      const lesson = await this.lessonModel.findByPk(item.lesson_id);
      if (!lesson) {
        throw new NotFoundException(
          `Lesson topilmadi: ${item.lesson_id}`,
        );
      }

      const unit = await this.unitModel.findByPk(item.unit_id);
      if (!unit) {
        throw new NotFoundException(
          `Unit topilmadi: ${item.unit_id}`,
        );
      }

      lesson.unit_id = item.unit_id;
      await lesson.save();

      updatedLessons.push(lesson);
    }

    return {
      message: 'Bulk update muvaffaqiyatli',
      count: updatedLessons.length,
      lessons: updatedLessons,
    };
  }

  // YANGI FEATURE
  // Level ichidagi unitlarni avtomatik lessonlarga taqsimlash
  async autoAssignUnitsByLevel(groupId: number, levelId: number) {
    const group = await this.groupModel.findByPk(groupId);
    if (!group) throw new NotFoundException('Group topilmadi');

    const lessons = await this.lessonModel.findAll({
      where: { group_id: groupId },
      order: [['date', 'ASC']],
    });

    if (!lessons.length) {
      throw new NotFoundException('Bu guruhda darslar yo\'q');
    }

    const units = await this.unitModel.findAll({
      where: { level_id: levelId },
      order: [['id', 'ASC']],
    });

    if (!units.length) {
      throw new NotFoundException('Bu levelda unitlar yo\'q');
    }

    let unitIndex = 0;
    const result = [];

    for (const lesson of lessons) {
      const unit = units[unitIndex];

      if (unit) {
        lesson.unit_id = unit.id;
        unitIndex++;
      } else {
        lesson.unit_id = null;
      }

      await lesson.save();
      result.push(lesson);
    }

    return {
      message: 'Unitlar avtomatik darslarga taqsimlandi',
      group_id: groupId,
      level_id: levelId,
      lessons_count: lessons.length,
      units_used: unitIndex,
      lessons: result,
    };
  }

  async removeLesson(lessonId: number) {
    const lesson = await this.lessonModel.findByPk(lessonId);
    if (!lesson) throw new NotFoundException('Lesson topilmadi');

    // Delete associated attendances first
    await this.attendanceModel.destroy({ where: { lesson_id: lessonId } });

    await lesson.destroy();
    return { message: 'Lesson o\'chirildi' };
  }

  async removeAllByGroup(groupId: number) {
    const group = await this.groupModel.findByPk(groupId);
    if (!group) throw new NotFoundException('Group topilmadi');

    // Delete attendances for all lessons in this group
    const lessons = await this.lessonModel.findAll({ where: { group_id: groupId }, attributes: ['id'] });
    const lessonIds = lessons.map(l => l.id);
    if (lessonIds.length > 0) {
      await this.attendanceModel.destroy({ where: { lesson_id: lessonIds } });
    }

    const deleted = await this.lessonModel.destroy({
      where: { group_id: groupId },
    });
    return { message: `${deleted} ta dars o'chirildi`, deleted_count: deleted };
  }
}
