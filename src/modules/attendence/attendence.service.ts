import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AttendanceModel } from './model/attendence.entity';
import { GroupLessonModel } from '../group-lesson/entities/group-lesson.entity';
import { StudentModel } from '../students/model/student.entity';
import { GroupModel } from '../groups/model/group.entity';
import { GroupStudentModel } from '../group_student_model';
import { Op } from 'sequelize';
import { MarkLessonAttendanceDto } from './dto/mark-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(AttendanceModel)
    private attendanceRepo: typeof AttendanceModel,

    @InjectModel(GroupLessonModel)
    private lessonRepo: typeof GroupLessonModel,

    @InjectModel(StudentModel)
    private studentRepo: typeof StudentModel,

    @InjectModel(GroupModel)
    private groupRepo: typeof GroupModel,

    @InjectModel(GroupStudentModel)
    private groupStudentRepo: typeof GroupStudentModel,
  ) {}

  private normalizeDate(date: string) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  /*
  LESSON ATTENDANCE YOZISH
  */
  async markLessonAttendance(dto: MarkLessonAttendanceDto) {
    const lesson = await this.lessonRepo.findByPk(dto.lesson_id);

    if (!lesson) {
      throw new NotFoundException('Lesson topilmadi');
    }

    const result = [];

    for (const item of dto.attendance) {
      const student = await this.studentRepo.findByPk(item.student_id);

      if (!student) {
        throw new NotFoundException(`Student topilmadi ${item.student_id}`);
      }

      const existing = await this.attendanceRepo.findOne({
        where: {
          lesson_id: dto.lesson_id,
          student_id: item.student_id,
        },
      });

      if (existing) {
        await existing.update({
          is_present: item.is_present,
          reason: item.reason,
        });
        result.push(existing);
        continue;
      }

      const attendance = await this.attendanceRepo.create({
        group_id: lesson.group_id,
        lesson_id: dto.lesson_id,
        student_id: item.student_id,
        date: lesson.date,
        is_present: item.is_present,
        reason: item.reason,
      });

      result.push(attendance);
    }

    return result;
  }

  /*
  GURUH + SANA ATTENDANCE (FIX)
  */
  async getGroupAttendance(group_id: number, date: string) {
    const group = await this.groupRepo.findByPk(group_id);

    if (!group) {
      throw new NotFoundException('Group topilmadi');
    }

    const normalizedDate = this.normalizeDate(date);

    const lessons = await this.lessonRepo.findAll({
      where: {
        group_id,
        date: {
          [Op.gte]: normalizedDate,
          [Op.lt]: new Date(
            normalizedDate.getTime() + 24 * 60 * 60 * 1000,
          ),
        },
      },
    });

    if (!lessons.length) {
      return [];
    }

    const lessonIds = lessons.map((l) => l.id);

    return this.attendanceRepo.findAll({
      where: {
        lesson_id: lessonIds,
      },
      include: [StudentModel],
      order: [['student_id', 'ASC']],
    });
  }

  /*
  OYLIK DAVOMAT GRID (barcha studentlar + barcha darslar)
  */
  async monthlyGrid(group_id: number, year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const lessons = await this.lessonRepo.findAll({
      where: {
        group_id,
        date: { [Op.gte]: start, [Op.lt]: end },
      },
      order: [['date', 'ASC']],
      attributes: ['id', 'date', 'start_time', 'end_time'],
    });

    if (!lessons.length) {
      return { lessons: [], attendance: [], student_join_dates: {} };
    }

    const lessonIds = lessons.map((l) => l.id);

    const attendance = await this.attendanceRepo.findAll({
      where: { lesson_id: lessonIds },
      attributes: ['id', 'lesson_id', 'student_id', 'is_present', 'reason'],
    });

    // Get student join dates for the group
    let studentJoinDates: Record<number, string> = {};
    try {
      const groupStudents = await this.groupStudentRepo.findAll({
        where: { group_id },
        attributes: ['student_id', 'joined_date'],
      });
      for (const gs of groupStudents) {
        studentJoinDates[Number(gs.student_id)] = gs.joined_date ? new Date(gs.joined_date).toISOString().split('T')[0] : '';
      }
    } catch {}

    const map: Record<number, Record<number, { is_present: boolean; reason?: string }>> = {};
    for (const a of attendance) {
      if (!map[a.lesson_id]) map[a.lesson_id] = {};
      map[a.lesson_id][a.student_id] = { is_present: a.is_present, reason: a.reason || undefined };
    }

    return {
      lessons: lessons.map(l => ({
        id: l.id,
        date: l.date,
        start_time: l.start_time,
        end_time: l.end_time,
      })),
      attendance: map,
      student_join_dates: studentJoinDates,
    };
  }

  /*
  OYLIK STATISTIKA
  */
  async monthlyStats(group_id: number, year: number, month: number) {
    const group = await this.groupRepo.findByPk(group_id);

    if (!group) {
      throw new NotFoundException('Group topilmadi');
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const lessons = await this.lessonRepo.findAll({
      where: {
        group_id,
        date: {
          [Op.gte]: start,
          [Op.lt]: end,
        },
      },
    });

    const lessonIds = lessons.map((l) => l.id);

    const attendances = await this.attendanceRepo.findAll({
      where: {
        lesson_id: lessonIds,
      },
    });

    const total = attendances.length;
    const present = attendances.filter((a) => a.is_present).length;
    const absent = attendances.filter((a) => !a.is_present).length;

    return {
      lessons: lessons.length,
      totalAttendance: total,
      present,
      absent,
      presentPercent: total ? ((present / total) * 100).toFixed(2) : 0,
      absentPercent: total ? ((absent / total) * 100).toFixed(2) : 0,
    };
  }
}