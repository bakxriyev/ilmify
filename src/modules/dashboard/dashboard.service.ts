import { Injectable, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import { QueryTypes } from 'sequelize';
import { StudentModel } from '../students/model/student.entity';
import { TeacherModel } from '../teachers/model/teacher.model';
import { GroupModel } from '../groups/model/group.entity';
import { LevelModel } from '../level/model/level.entity';
import { RoomModel } from '../rooms/entities/room.entity';
import { GroupLessonModel } from '../group-lesson/entities/group-lesson.entity';
import { AttendanceModel } from '../attendence/model/attendence.entity';
import { GroupStudentModel } from '../group_student_model';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(StudentModel) private studentModel: typeof StudentModel,
    @InjectModel(TeacherModel) private teacherModel: typeof TeacherModel,
    @InjectModel(GroupModel) private groupModel: typeof GroupModel,
    @InjectModel(LevelModel) private levelModel: typeof LevelModel,
    @InjectModel(RoomModel) private roomModel: typeof RoomModel,
    @InjectModel(GroupLessonModel) private lessonModel: typeof GroupLessonModel,
    @InjectModel(AttendanceModel) private attendanceModel: typeof AttendanceModel,
    @InjectModel(GroupStudentModel) private groupStudentModel: typeof GroupStudentModel,
    @InjectConnection() private sequelize: Sequelize,
  ) {}

  async getStats(center_id?: number) {
    const studentWhere: any = {};
    const teacherWhere: any = {};
    const groupWhere: any = {};
    if (center_id) {
      studentWhere.center_id = center_id;
      teacherWhere.center_id = center_id;
      groupWhere.center_id = center_id;
    }

    const [totalStudents, totalTeachers, totalGroups, totalLevels, totalRooms] = await Promise.all([
      this.studentModel.count({ where: studentWhere }),
      this.teacherModel.count({ where: teacherWhere }),
      this.groupModel.count({ where: groupWhere }),
      this.levelModel.count(),
      this.roomModel.count({ where: center_id ? { center_id } : {} }),
    ]);

    let groupIds: number[] = [];
    if (center_id) {
      const groups = await this.groupModel.findAll({ where: { center_id }, attributes: ['id'] });
      groupIds = groups.map(g => g.id);
    }

    const lessonWhere: any = {};
    if (groupIds.length) lessonWhere.group_id = groupIds;
    const totalLessons = await this.lessonModel.count({ where: lessonWhere });

    const attendanceWhere: any = {};
    if (groupIds.length) attendanceWhere.group_id = groupIds;
    const [totalAttendance, presentAttendance] = await Promise.all([
      this.attendanceModel.count({ where: attendanceWhere }),
      this.attendanceModel.count({ where: { ...attendanceWhere, is_present: true } }),
    ]);
    const attendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;

    const lessonGroupsWhere: any = {};
    if (groupIds.length) lessonGroupsWhere.group_id = groupIds;
    const lessonGroups = await this.lessonModel.findAll({
      attributes: ['group_id'],
      where: lessonGroupsWhere,
      group: ['group_id'],
    });

    return {
      total_students: totalStudents,
      total_teachers: totalTeachers,
      total_groups: totalGroups,
      total_levels: totalLevels,
      total_rooms: totalRooms,
      total_lessons: totalLessons,
      attendance_rate: attendanceRate,
      students_this_month: 0,
      groups_with_lessons: lessonGroups.length,
    };
  }

  async getStudentGrowth(center_id?: number) {
    const now = new Date();

    let result: any[];
    if (center_id) {
      result = await this.sequelize.query(`
        SELECT
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*)::int as count
        FROM "students"
        WHERE "center_id" = $1 AND "createdAt" >= $2
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month
      `, {
        bind: [center_id, new Date(now.getFullYear() - 1, now.getMonth(), 1)],
        type: QueryTypes.SELECT,
      });
    } else {
      result = await this.sequelize.query(`
        SELECT
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*)::int as count
        FROM "students"
        WHERE "createdAt" >= $1
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month
      `, {
        bind: [new Date(now.getFullYear() - 1, now.getMonth(), 1)],
        type: QueryTypes.SELECT,
      });
    }

    const monthCounts = new Map<string, number>();
    for (const row of result as any[]) {
      const d = new Date(row.month);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthCounts.set(key, row.count);
    }

    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    const labels: string[] = [];
    const newData: number[] = [];
    const cumulativeData: number[] = [];
    let cumulative = 0;

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      labels.push(months[d.getMonth()]);
      const count = monthCounts.get(key) || 0;
      newData.push(count);
      cumulative += count;
      cumulativeData.push(cumulative);
    }

    return {
      labels,
      datasets: [
        { label: "Yangi o'quvchilar", data: newData, backgroundColor: '#3b82f6' },
        { label: 'Jami o\'quvchilar', data: cumulativeData, backgroundColor: '#10b981' },
      ],
    };
  }

  async getGroupDistribution(center_id?: number) {
    const where: any = {};
    if (center_id) where.center_id = center_id;

    const groups = await this.groupModel.findAll({
      where,
      include: [{ model: LevelModel, as: 'level' }],
    });

    const groupIds = groups.map(g => g.id);
    const studentCounts = new Map<number, number>();
    if (groupIds.length > 0) {
      const counts = await this.groupStudentModel.findAll({
        attributes: ['group_id', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
        where: { group_id: groupIds },
        group: ['group_id'],
        raw: true,
      }) as any[];
      for (const row of counts) {
        studentCounts.set(Number(row.group_id), Number(row.count));
      }
    }

    const levelMap: Record<string, { count: number; students: number }> = {};
    for (const g of groups) {
      const levelName = g.level?.name || 'Nomsiz';
      if (!levelMap[levelName]) levelMap[levelName] = { count: 0, students: 0 };
      levelMap[levelName].count += 1;
      levelMap[levelName].students += studentCounts.get(Number(g.id)) || 0;
    }

    return {
      labels: Object.keys(levelMap),
      datasets: [
        {
          label: "Guruhlar",
          data: Object.values(levelMap).map((v) => v.count),
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
        },
      ],
    };
  }

  async getTopTeachersByGroups(limit = 5, center_id?: number) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    const teachers = await this.teacherModel.findAll({
      where,
      include: [
        { model: GroupModel, as: 'mainGroups' },
        { model: GroupModel, as: 'supportGroups' },
      ],
    });

    return teachers
      .map((t) => ({
        id: t.id,
        first_name: t.first_name,
        last_name: t.last_name,
        gmail: t.gmail,
        total_groups: (t.mainGroups?.length || 0) + (t.supportGroups?.length || 0),
        main_groups: t.mainGroups?.length || 0,
        support_groups: t.supportGroups?.length || 0,
      }))
      .sort((a, b) => b.total_groups - a.total_groups)
      .slice(0, limit);
  }

  async getTopTeachersByStudents(limit = 5, center_id?: number) {
    const where: any = {};
    if (center_id) where.center_id = center_id;

    const [teachers, studentCounts] = await Promise.all([
      this.teacherModel.findAll({
        where,
        include: [
          { model: GroupModel, as: 'mainGroups' },
          { model: GroupModel, as: 'supportGroups' },
        ],
      }),
      this.groupStudentModel.findAll({
        attributes: ['group_id', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
        group: ['group_id'],
        raw: true,
      }) as Promise<any[]>,
    ]);

    const groupStudentMap = new Map<number, number>();
    for (const row of studentCounts) {
      groupStudentMap.set(Number(row.group_id), Number(row.count));
    }

    const result = teachers.map((t) => {
      const allGroups = [...(t.mainGroups || []), ...(t.supportGroups || [])];
      let totalStudents = 0;
      for (const g of allGroups) {
        totalStudents += groupStudentMap.get(Number(g.id)) || 0;
      }
      return {
        id: t.id,
        first_name: t.first_name,
        last_name: t.last_name,
        gmail: t.gmail,
        total_students: totalStudents,
        total_groups: allGroups.length,
      };
    });

    return result.sort((a, b) => b.total_students - a.total_students).slice(0, limit);
  }

  async getBestAttendanceStudents(limit = 10, center_id?: number) {
    const studentWhere: any = {};
    if (center_id) studentWhere.center_id = center_id;
    const students = await this.studentModel.findAll({
      where: studentWhere,
      attributes: ['id', 'first_name', 'last_name'],
      limit: 200,
    });

    if (students.length === 0) return [];

    const studentIds = students.map(s => s.id);
    const sIdMap = new Map<number, typeof students[0]>();
    for (const s of students) sIdMap.set(Number(s.id), s);

    const attendanceRows = await this.attendanceModel.findAll({
      attributes: [
        'student_id',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total'],
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN is_present THEN 1 ELSE 0 END')), 'present'],
      ],
      where: { student_id: studentIds },
      group: ['student_id'],
      raw: true,
    }) as any[];

    const result = attendanceRows
      .map((row: any) => {
        const sid = Number(row.student_id);
        const s = sIdMap.get(sid);
        if (!s) return null;
        const total = Number(row.total);
        const present = Number(row.present);
        return {
          id: sid,
          first_name: s.first_name,
          last_name: s.last_name,
          group_name: "Guruhsiz",
          total_attendance: total,
          present,
          absent: total - present,
          attendance_rate: total > 0 ? Math.round((present / total) * 100) : 0,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.attendance_rate - a.attendance_rate)
      .slice(0, limit);

    return result;
  }

  async getMonthlyAttendance(center_id?: number) {
    const now = new Date();
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    const labels: string[] = [];
    const presentData: number[] = [];
    const absentData: number[] = [];

    let allGroupIds: number[] = [];
    if (center_id) {
      const groups = await this.groupModel.findAll({ where: { center_id }, attributes: ['id'] });
      allGroupIds = groups.map(g => g.id);
    }

    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    let monthAttendance: any[];
    if (allGroupIds.length > 0) {
      monthAttendance = await this.sequelize.query(`
        SELECT
          DATE_TRUNC('month', "date") as month,
          is_present,
          COUNT(*)::int as count
        FROM "attendances"
        WHERE "date" >= $1 AND "group_id" = ANY($2::int[])
        GROUP BY DATE_TRUNC('month', "date"), is_present
        ORDER BY month
      `, {
        bind: [twelveMonthsAgo, allGroupIds],
        type: QueryTypes.SELECT,
      });
    } else {
      monthAttendance = await this.sequelize.query(`
        SELECT
          DATE_TRUNC('month', "date") as month,
          is_present,
          COUNT(*)::int as count
        FROM "attendances"
        WHERE "date" >= $1
        GROUP BY DATE_TRUNC('month', "date"), is_present
        ORDER BY month
      `, {
        bind: [twelveMonthsAgo],
        type: QueryTypes.SELECT,
      });
    }

    const monthData = new Map<string, { present: number; absent: number }>();
    for (const row of monthAttendance as any[]) {
      const d = new Date(row.month);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthData.has(key)) monthData.set(key, { present: 0, absent: 0 });
      const data = monthData.get(key)!;
      if (row.is_present) data.present = row.count;
      else data.absent = row.count;
    }

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      labels.push(months[d.getMonth()]);
      const data = monthData.get(key) || { present: 0, absent: 0 };
      presentData.push(data.present);
      absentData.push(data.absent);
    }

    return {
      labels,
      datasets: [
        { label: 'Keldi', data: presentData, backgroundColor: '#10b981' },
        { label: 'Kelmadi', data: absentData, backgroundColor: '#ef4444' },
      ],
    };
  }

  async getRecentActivities(limit = 10, center_id?: number) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    const recentGroups = await this.groupModel.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 5,
    });

    const activities: any[] = [];

    recentGroups.forEach((g) => {
      activities.push({
        type: 'group',
        message: `Yangi guruh yaratildi: ${g.name}`,
        time: g.created_at?.toISOString?.() || new Date().toISOString(),
        icon: 'group',
      });
    });

    return activities.slice(0, limit);
  }
}
