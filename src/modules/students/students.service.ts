import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { StudentModel } from './model/student.entity';
import { GroupModel } from '../groups/model/group.entity';
import { TeacherModel } from '../teachers/model/teacher.model';
import { LevelModel } from '../level/model/level.entity';
import { GroupStudentModel } from '../group_student_model';
import { AttendanceModel } from '../attendence/model/attendence.entity';
import { StudentAnswerModel } from '../student-answer/model/student-answer.entity';
import { ExerciseResultModel } from '../exercises_result/model/exercises_result.entity';
import { VocabResultModel } from '../vocab_result';
import { UnitResultModel } from '../unit_result/model/unit_result.entity';
import { GroupLessonModel } from '../group-lesson/entities/group-lesson.entity';
import { StudentCoinsModel } from '../student-coins/entities/student-coin.entity';
import { ParentModel } from '../parents/entities/parent.entity';
import { ParentStudentModel } from '../parents/entities/parent-student.entity';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';
import { TariffModel } from '../tariffs/entities/tariff.entity';
import {
  CreateStudentDto,
  UpdateStudentDto,
  UpdateStudentPasswordDto,
  StudentQueryDto,
  BulkCreateStudentDto,
  AssignToGroupDto,
} from './dto/student.dto';

@Injectable()
export class StudentService {
  constructor(
    @InjectModel(StudentModel)
    private studentModel: typeof StudentModel,

    @InjectModel(ParentModel)
    private parentModel: typeof ParentModel,

    @InjectModel(ParentStudentModel)
    private parentStudentModel: typeof ParentStudentModel,

    @InjectModel(EducationCenterModel)
    private educationCenterModel: typeof EducationCenterModel,

    @InjectModel(TariffModel)
    private tariffModel: typeof TariffModel,
  ) {}

  private async checkStudentLimit(center_id: number) {
    if (!center_id) return;
    const center = await this.educationCenterModel.findByPk(center_id, {
      include: [{ model: this.tariffModel }],
    });
    if (!center) return;
    if (center.tariff) {
      const count = await this.studentModel.count({ where: { center_id } });
      if (count >= center.tariff.student_max) {
        throw new ForbiddenException(
          `Talabalar soni chegarasiga yetdingiz (maksimal: ${center.tariff.student_max}). Tarifni yangilang.`,
        );
      }
    } else {
      const count = await this.studentModel.count({ where: { center_id } });
      if (count >= 100) {
        throw new ForbiddenException(
          'Sinov rejimida maksimal 100 talaba. Tarif tanlang.',
        );
      }
    }
  }

  // ================= CREATE =================
  async create(createDto: CreateStudentDto, center_id?: number) {
    const existingStudent = await this.studentModel.findOne({
      where: {
        [Op.or]: [
          { phone_number: createDto.phone_number },
          { email: createDto.email },
        ],
      },
    });

    if (existingStudent) {
      if (existingStudent.phone_number === createDto.phone_number)
        throw new ConflictException('Bu telefon nomer bilan student allaqachon mavjud');
      if (existingStudent.email === createDto.email)
        throw new ConflictException('Bu email bilan student allaqachon mavjud');
    }

    if (center_id) {
      await this.checkStudentLimit(center_id);
    }

    const { parent_first_name, parent_last_name, parent_phone_number, parent_password, ...studentData } = createDto;

    const student = await this.studentModel.create({
      ...studentData,
      password: createDto.password,
      center_id: center_id || null,
    });

    if (parent_first_name && parent_last_name && parent_phone_number) {
      let parent = await this.parentModel.findOne({
        where: { phone_number: parent_phone_number },
      });

      if (!parent) {
        const generatedPassword = parent_password
          || `${createDto.first_name.toLowerCase()}${createDto.last_name.toLowerCase()}`;

        parent = await this.parentModel.create({
          first_name: parent_first_name,
          last_name: parent_last_name,
          phone_number: parent_phone_number,
          password: generatedPassword,
          center_id: center_id || null,
        });
      }

      await this.parentStudentModel.findOrCreate({
        where: { parent_id: parent.id, student_id: student.id },
        defaults: { parent_id: parent.id, student_id: student.id },
      });
    }

    return this.findOne(student.id);
  }

  // ================= BULK CREATE =================
  async bulkCreate(bulkCreateDto: BulkCreateStudentDto) {
    const createdStudents = [];
    const errors = [];

    for (let i = 0; i < bulkCreateDto.students.length; i++) {
      try {
        const student = await this.create(bulkCreateDto.students[i]);
        createdStudents.push(student);
      } catch (error) {
        errors.push({
          index: i,
          student: bulkCreateDto.students[i],
          error: error.message,
        });
      }
    }

    return {
      success_count: createdStudents.length,
      error_count: errors.length,
      created_students: createdStudents,
      errors,
    };
  }

  // ================= FIND ALL =================
  async findAll(queryDto: StudentQueryDto, center_id?: number) {
    const page = queryDto.page ? parseInt(queryDto.page) : 1;
    const limit = queryDto.limit ? parseInt(queryDto.limit) : 10;
    const offset = (page - 1) * limit;

    const sort_by = queryDto.sort_by || 'id';
    const sort_order = queryDto.sort_order || 'ASC';

    const whereClause: any = {};

    if (center_id) whereClause.center_id = center_id;

    if (queryDto.first_name)
      whereClause.first_name = { [Op.iLike]: `%${queryDto.first_name}%` };
    if (queryDto.last_name)
      whereClause.last_name = { [Op.iLike]: `%${queryDto.last_name}%` };
    if (queryDto.email)
      whereClause.email = { [Op.iLike]: `%${queryDto.email}%` };
    if (queryDto.phone_number)
      whereClause.phone_number = { [Op.iLike]: `%${queryDto.phone_number}%` };

    if (queryDto.group_id) whereClause.group_id = parseInt(queryDto.group_id);
    if (queryDto.min_age || queryDto.max_age) {
      whereClause.age = {};
      if (queryDto.min_age) whereClause.age[Op.gte] = parseInt(queryDto.min_age);
      if (queryDto.max_age) whereClause.age[Op.lte] = parseInt(queryDto.max_age);
    }

    const { count, rows } = await this.studentModel.findAndCountAll({
      where: whereClause,
      include: [
        {
    model: StudentCoinsModel,
    attributes: ['coins', 'scores'],
    required: false,
  },
        {
          model: GroupModel,
          attributes: ['id', 'name'],
          required: false,
          include: [
            
            {
              model: TeacherModel,
              as: 'mainTeacher',
              attributes: { exclude: ['password'] },
              required: false,
            },
            {
              model: TeacherModel,
              as: 'supportTeacher',
              attributes: { exclude: ['password'] },
              required: false,
            },
            { model: LevelModel, as: 'level', required: false },
          ],
        },
        {
          model: GroupStudentModel,
          as: 'group_students',
          required: false,
          include: [
            {
              model: GroupModel,
              attributes: ['id', 'name'],
              required: false,
            },
          ],
        },
      ],
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [[sort_by, sort_order]],
      subQuery: false,
    });

    return {
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  // ================= FIND ONE =================
  async findOne(id: number, includeRelations = true) {
    const includeOptions = includeRelations
      ? [
        {
  model: StudentCoinsModel,
  as: 'coins',
  attributes: ['coins', 'scores'],
  required: false,
},
          {
            model: GroupModel,
            include: [
              { model: TeacherModel, as: 'mainTeacher', attributes: { exclude: ['password'] } },
              { model: TeacherModel, as: 'supportTeacher', attributes: { exclude: ['password'] } },
              { model: LevelModel, as: 'level' },
              { model: GroupLessonModel, as: 'lessons' },
            ],
          },
          {
            model: ParentStudentModel,
            as: 'parent_links',
            required: false,
            include: [{
              model: ParentModel,
              as: 'parent',
              attributes: ['id', 'first_name', 'last_name', 'phone_number', 'photo'],
            }],
          },
          {
            model: GroupStudentModel,
            separate: true,
            include: [
              {
                model: GroupModel,
                include: [
                  { model: TeacherModel, as: 'mainTeacher', attributes: { exclude: ['password'] } },
                  { model: TeacherModel, as: 'supportTeacher', attributes: { exclude: ['password'] } },
                  { model: LevelModel, as: 'level' },
                  { model: GroupLessonModel, as: 'lessons' },
                ],
              },
            ],
          },
          { model: AttendanceModel, required: false, separate: true, limit: 10, order: [['date', 'DESC']] as any },
          { model: StudentAnswerModel, required: false, separate: true, limit: 10, order: [['answered_at', 'DESC']] as any },
          { model: ExerciseResultModel, required: false, separate: true, limit: 10, order: [['completed_at', 'DESC']] as any },
          { model: VocabResultModel, required: false, separate: true, limit: 10, order: [['completed_at', 'DESC']] as any },
          { model: UnitResultModel, required: false, separate: true, limit: 10, order: [['completed_at', 'DESC']] as any },
        ]
      : [
          {
            model: GroupModel,
            include: [
              { model: TeacherModel, as: 'mainTeacher', attributes: { exclude: ['password'] } },
              { model: TeacherModel, as: 'supportTeacher', attributes: { exclude: ['password'] } },
              { model: LevelModel, as: 'level' },
            ],
          },
        ];

    const student = await this.studentModel.findByPk(id, {
      include: includeOptions,
      attributes: { exclude: ['password'] },
    });

    if (!student) throw new NotFoundException('Student topilmadi');
    return student;
  }

  // ================= UPDATE =================
  async update(id: number, updateDto: UpdateStudentDto) {
    const student = await this.studentModel.findByPk(id, {
      attributes: { exclude: ['password'] },
    });
    if (!student) throw new NotFoundException('Student topilmadi');

    if (updateDto.email || updateDto.phone_number) {
      const whereCondition: any = { id: { [Op.ne]: id } };
      const orConditions = [];
      if (updateDto.email) orConditions.push({ email: updateDto.email });
      if (updateDto.phone_number) orConditions.push({ phone_number: updateDto.phone_number });
      if (orConditions.length) whereCondition[Op.or] = orConditions;

      const existingStudent = await this.studentModel.findOne({ where: whereCondition });
      if (existingStudent) {
        if (updateDto.email && existingStudent.email === updateDto.email)
          throw new ConflictException('Bu email bilan boshqa student mavjud');
        if (updateDto.phone_number && existingStudent.phone_number === updateDto.phone_number)
          throw new ConflictException('Bu telefon nomer bilan boshqa student mavjud');
      }
    }

    await student.update(updateDto);
    return this.findOne(id, false);
  }

  // ================= UPDATE PASSWORD =================
  async updatePassword(id: number, updatePasswordDto: UpdateStudentPasswordDto) {
    const student = await this.studentModel.findByPk(id);
    if (!student) throw new NotFoundException('Student topilmadi');

    if (updatePasswordDto.old_password !== student.password)
      throw new BadRequestException('Eski parol noto\'g\'ri');

    await student.update({ password: updatePasswordDto.new_password });
    return { message: 'Parol muvaffaqiyatli yangilandi' };
  }

  // ================= DELETE =================
  async remove(id: number) {
    const student = await this.studentModel.findByPk(id);
    if (!student) throw new NotFoundException('Student topilmadi');

    await student.destroy();
    return { message: 'Student muvaffaqiyatli o\'chirildi', id };
  }

  // ================= ASSIGN TO GROUP =================
  async assignToGroup(assignDto: AssignToGroupDto) {
    const { group_id, student_ids } = assignDto;
    const students = await this.studentModel.findAll({ where: { id: { [Op.in]: student_ids } } });
    if (students.length !== student_ids.length) throw new NotFoundException('Ba\'zi studentlar topilmadi');

    await this.studentModel.update({ group_id }, { where: { id: { [Op.in]: student_ids } } });

    return { message: `${student_ids.length} ta student guruhga tayinlandi`, group_id, student_ids };
  }

  // ================= REMOVE FROM GROUP =================
  async removeFromGroup(studentIds: number[]) {
    await this.studentModel.update({ group_id: null }, { where: { id: { [Op.in]: studentIds } } });
    return { message: `${studentIds.length} ta student guruhdan chiqarildi`, student_ids: studentIds };
  }

  // ================= STUDENT STATISTICS =================
  async getStudentStatistics(id: number) {
    const student = await this.findOne(id, false);

    const [
      totalAnswers,
      correctAnswers,
      completedExercises,
      completedVocabs,
      completedUnits,
      attendanceCount,
    ] = await Promise.all([
      StudentAnswerModel.count({ where: { student_id: id } }),
      StudentAnswerModel.count({ where: { student_id: id, is_correct: true } }),
      ExerciseResultModel.count({ where: { student_id: id, is_completed: true } }),
      VocabResultModel.count({ where: { student_id: id, is_completed: true } }),
      UnitResultModel.count({ where: { student_id: id, is_completed: true } }),
      AttendanceModel.count({ where: { student_id: id, is_present: true } }),
    ]);

    return {
      student_info: {
        id: student.id,
        full_name: `${student.first_name} ${student.last_name}`,
        email: student.email,
        group: student.group?.name || 'Guruhga tayinlanmagan',
      },
      academic_stats: {
        total_answers: totalAnswers,
        correct_answers: correctAnswers,
        incorrect_answers: totalAnswers - correctAnswers,
        accuracy_rate: totalAnswers > 0 ? ((correctAnswers / totalAnswers) * 100).toFixed(2) : '0.00',
        completed_exercises: completedExercises,
        completed_vocabs: completedVocabs,
        completed_units: completedUnits,
      },
      attendance_stats: { present_days: attendanceCount },
    };
  }

  // ================= GET STUDENTS BY GROUP =================
  async getStudentsByGroup(groupId: number, queryDto: StudentQueryDto) {
    return this.findAll({ ...queryDto, group_id: groupId.toString() });
  }

  // ================= GET PROFILE =================
  async getProfile(studentId: string) {
    const student = await this.studentModel.findByPk(parseInt(studentId), {
      include: ['group'],
      attributes: { exclude: ['password'] },
    });
    if (!student) throw new NotFoundException('Student topilmadi');
    return student;
  }

  // ================= FIND STUDENTS WITHOUT GROUP =================
  async findWithoutGroup(center_id?: number) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    const students = await this.studentModel.findAll({
      where,
      include: [{ model: GroupStudentModel, as: 'group_students', required: false }],
      attributes: { exclude: ['password'] },
    });

    const filteredStudents = students.filter(
      (student) => !student.group_students || student.group_students.length === 0,
    );

    return { data: filteredStudents, total: filteredStudents.length };
  }
}