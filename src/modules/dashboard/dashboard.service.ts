import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
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
  constructor(
    @InjectModel(StudentModel) private studentModel: typeof StudentModel,
    @InjectModel(TeacherModel) private teacherModel: typeof TeacherModel,
    @InjectModel(GroupModel) private groupModel: typeof GroupModel,
    @InjectModel(LevelModel) private levelModel: typeof LevelModel,
    @InjectModel(RoomModel) private roomModel: typeof RoomModel,
    @InjectModel(GroupLessonModel) private lessonModel: typeof GroupLessonModel,
    @InjectModel(AttendanceModel) private attendanceModel: typeof AttendanceModel,
    @InjectModel(GroupStudentModel) private groupStudentModel: typeof GroupStudentModel,
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

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const studentsThisMonthWhere: any = {};
    if (center_id) studentsThisMonthWhere.center_id = center_id;
    const studentsThisMonth = await this.studentModel.count({
      where: { ...studentsThisMonthWhere, createdAt: { [Op.gte]: monthStart } },
    });

    return {
      total_students: totalStudents,
      total_teachers: totalTeachers,
      total_groups: totalGroups,
      total_levels: totalLevels,
      total_rooms: totalRooms,
      total_lessons: totalLessons,
      attendance_rate: attendanceRate,
      students_this_month: studentsThisMonth,
      groups_with_lessons: lessonGroups.length,
    };
  }

  async getStudentGrowth(center_id?: number) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    const total = await this.studentModel.count({ where });
    const now = new Date();
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    const labels: string[] = [];
    const newData: number[] = [];
    const cumulativeData: number[] = [];

    const perMonth = Math.max(1, Math.floor(total / 12));

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(months[d.getMonth()]);
      newData.push(perMonth);
      cumulativeData.push(perMonth * (12 - i));
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

    const levelMap: Record<string, { count: number; students: number }> = {};
    for (const g of groups) {
      const levelName = g.level?.name || 'Nomsiz';
      if (!levelMap[levelName]) levelMap[levelName] = { count: 0, students: 0 };
      levelMap[levelName].count += 1;
      const studentCount = await this.groupStudentModel.count({ where: { group_id: g.id } });
      levelMap[levelName].students += studentCount;
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
    const teachers = await this.teacherModel.findAll({
      where,
      include: [
        { model: GroupModel, as: 'mainGroups' },
        { model: GroupModel, as: 'supportGroups' },
      ],
    });

    const result: any[] = [];
    for (const t of teachers) {
      const allGroups = [...(t.mainGroups || []), ...(t.supportGroups || [])];
      let totalStudents = 0;
      for (const g of allGroups) {
        const cnt = await this.groupStudentModel.count({ where: { group_id: g.id } });
        totalStudents += cnt;
      }
      result.push({
        id: t.id,
        first_name: t.first_name,
        last_name: t.last_name,
        gmail: t.gmail,
        total_students: totalStudents,
        total_groups: allGroups.length,
      });
    }

    return result.sort((a, b) => b.total_students - a.total_students).slice(0, limit);
  }

  async getBestAttendanceStudents(limit = 10, center_id?: number) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    const students = await this.studentModel.findAll({ where, limit: 200 });

    const result: any[] = [];
    for (const s of students) {
      const total = await this.attendanceModel.count({ where: { student_id: Number(s.id) } });
      if (total === 0) continue;
      const present = await this.attendanceModel.count({ where: { student_id: Number(s.id), is_present: true } });
      result.push({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        group_name: "Guruhsiz",
        total_attendance: total,
        present,
        absent: total - present,
        attendance_rate: Math.round((present / total) * 100),
      });
    }

    return result.sort((a, b) => b.attendance_rate - a.attendance_rate).slice(0, limit);
  }

  async getMonthlyAttendance(center_id?: number) {
    const now = new Date();
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    const labels: string[] = [];
    const presentData: number[] = [];
    const absentData: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      labels.push(months[d.getMonth()]);

      const attendanceWhere: any = {
        date: { [Op.gte]: d.toISOString().split('T')[0], [Op.lt]: monthEnd.toISOString().split('T')[0] },
      };

      if (center_id) {
        attendanceWhere['$group_id$'] = { [Op.in]: Sequelize.literal(`(SELECT id FROM groups WHERE center_id = ${center_id})`) };
      }

      const [present, absent] = await Promise.all([
        this.attendanceModel.count({
          where: { ...attendanceWhere, is_present: true },
        }),
        this.attendanceModel.count({
          where: { ...attendanceWhere, is_present: false },
        }),
      ]);

      presentData.push(present);
      absentData.push(absent);
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
