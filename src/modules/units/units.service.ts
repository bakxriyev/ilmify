// src/modules/units/unit.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import { UnitModel } from './model';
import { ExerciseModel } from '../exercises/model/exercise.entity';
import { StudentAnswerModel } from '../student-answer/model';
import { UnitResultModel } from '../unit_result/model';
import {
  CreateUnitDto,
  UpdateUnitDto,
  UnitQueryDto,
  BulkCreateUnitDto,
} from './dto';

@Injectable()
export class UnitService {
  constructor(
    @InjectModel(UnitModel)
    private unitModel: typeof UnitModel,

    @InjectModel(ExerciseModel)
    private exerciseModel: typeof ExerciseModel,

    @InjectModel(StudentAnswerModel)
    private studentAnswerModel: typeof StudentAnswerModel,

    @InjectModel(UnitResultModel)
    private unitResultModel: typeof UnitResultModel,
  ) {}

  // ────────────────────────────────────────────────
  // CREATE
  // ────────────────────────────────────────────────
  async create(createDto: CreateUnitDto) {
    const existing = await this.unitModel.findOne({
      where: { title: createDto.title?.trim() },
    });

    const unit = await this.unitModel.create({
      ...createDto,
      title: createDto.title?.trim(),
      name: createDto.name?.trim(),
    });

    return this.findOne(unit.id);
  }

  async bulkCreate(bulkDto: BulkCreateUnitDto) {
    const successes: any[] = [];
    const failures: { index: number; unit: any; error: string }[] = [];

    for (let i = 0; i < bulkDto.units.length; i++) {
      try {
        const created = await this.create(bulkDto.units[i]);
        successes.push(created);
      } catch (err: any) {
        failures.push({
          index: i,
          unit: bulkDto.units[i],
          error: err.message || 'Noma\'lum xato',
        });
      }
    }

    return {
      success_count: successes.length,
      error_count: failures.length,
      created_units: successes,
      errors: failures,
    };
  }

  // ────────────────────────────────────────────────
  // READ - List
  // ────────────────────────────────────────────────
  async findAll(query: UnitQueryDto) {
    const {
      page = 1,
      limit = 10,
      sort_by = 'title',
      sort_order = 'ASC',
      include_relations = false,
      title,
      description,
      level_id,
    } = query;

    const offset = (page - 1) * limit;
    const where: any = {};

    if (title) where.title = { [Op.iLike]: `%${title.trim()}%` };
    if (description) where.description = { [Op.iLike]: `%${description.trim()}%` };
    if (level_id) where.level_id = level_id;

    const include = include_relations
      ? [
          {
            model: ExerciseModel,
            required: false,
            attributes: ['id', 'title', 'type', 'description'],
          },
        ]
      : [];

    const { count, rows } = await this.unitModel.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [[sort_by, sort_order.toUpperCase()]],
      distinct: true,
    });

    const enriched = await Promise.all(
      rows.map(async (unit) => {
        const [exercisesCount, studentsAttempted] = await Promise.all([
          this.exerciseModel.count({ where: { unit_id: unit.id } }),
          this.unitResultModel.count({
            where: { unit_id: unit.id },
            distinct: true,
            col: 'student_id',
          }),
        ]);

        return {
          ...unit.toJSON(),
          exercises_count: exercisesCount,
          students_attempted: studentsAttempted,
        };
      }),
    );

    return {
      data: enriched,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  // ────────────────────────────────────────────────
  // READ - Single
  // ────────────────────────────────────────────────
  async findOne(id: number, withRelations = true) {
    const include = withRelations
      ? [
          {
            model: ExerciseModel,
            required: false,
            attributes: ['id', 'title', 'type', 'description'],
          },
          {
            model: UnitResultModel,
            required: false,
            attributes: ['id', 'student_id', 'overall_percentage', 'is_completed'],
            limit: 5,
            order: [['completed_at', 'DESC']],
          },
        ]
      : [];

    const unit = await this.unitModel.findByPk(id, {
      rejectOnEmpty: false,
    });

    if (!unit) {
      throw new NotFoundException(`Unit #${id} topilmadi`);
    }

    if (withRelations) {
      const [exercisesCount, studentsAttempted] = await Promise.all([
        this.exerciseModel.count({ where: { unit_id: id } }),
        this.unitResultModel.count({
          where: { unit_id: id },
          distinct: true,
          col: 'student_id',
        }),
      ]);

      return {
        ...unit.toJSON(),
        exercises_count: exercisesCount,
        students_attempted: studentsAttempted,
      };
    }

    return unit.toJSON();
  }

  // ────────────────────────────────────────────────
  // STATISTICS (eng muhim qismi - to'g'ri hisoblanadi)
  // ────────────────────────────────────────────────
  async getUnitStatistics(id: number) {
    const unit = await this.findOne(id, false);

    const [
      totalExercises,
      totalStudentsAttempted,
      totalCompleted,
      totalCorrectTasks,
      totalTasks,
      avgOverallPercentage,
    ] = await Promise.all([
      // 1. Umumiy mashqlar soni
      this.exerciseModel.count({ where: { unit_id: id } }),

      // 2. Unitga kirgan talabalar soni
      this.unitResultModel.count({
        where: { unit_id: id },
        distinct: true,
        col: 'student_id',
      }),

      // 3. Yakunlagan talabalar soni
      this.unitResultModel.count({
        where: { unit_id: id, is_completed: true },
        distinct: true,
        col: 'student_id',
      }),

      // 4. To'g'ri javoblar (tasks bo'yicha)
      this.unitResultModel.sum('correct_tasks', {
        where: { unit_id: id },
      }),

      // 5. Umumiy topshiriqlar soni
      this.unitResultModel.sum('total_tasks', {
        where: { unit_id: id },
      }),

      // 6. O'rtacha umumiy foiz (overall_percentage)
      this.unitResultModel.findOne({
        where: { unit_id: id },
        attributes: [
          [Sequelize.fn('AVG', Sequelize.col('overall_percentage')), 'avg_percentage'],
        ],
        raw: true,
      }),
    ]);


    const accuracyRate =
      totalTasks > 0 ? ((totalCorrectTasks / totalTasks) * 100).toFixed(2) : '0.00';

    return {
      unit_id: id,
      title: unit.title || 'Nomsiz unit',
      total_exercises: totalExercises,
      total_students_attempted: totalStudentsAttempted,
      total_completed: totalCompleted,
      completion_rate:
        totalStudentsAttempted > 0
          ? ((totalCompleted / totalStudentsAttempted) * 100).toFixed(2)
          : '0.00',
      total_correct_tasks: totalCorrectTasks,
      total_tasks: totalTasks,
      accuracy_rate: accuracyRate
    };
  }

  async update(id: number, dto: UpdateUnitDto) {
    const unit = await this.unitModel.findByPk(id);
    if (!unit) throw new NotFoundException(`Unit #${id} topilmadi`);

    if (dto.title?.trim() && dto.title.trim() !== unit.title) {
      const conflict = await this.unitModel.findOne({
        where: { title: dto.title.trim(), id: { [Op.ne]: id } },
      });
      if (conflict) throw new ConflictException('Bu nom boshqa unitda mavjud');
    }

    await unit.update({
      ...dto,
      title: dto.title?.trim(),
      name: dto.name?.trim(),
    });

    return this.findOne(id, false);
  }


  async getUnitExercises(id: number, page = 1, limit = 10) {
    await this.findOne(id, false);

    const offset = (page - 1) * limit;

    const { count, rows } = await this.exerciseModel.findAndCountAll({
      where: { unit_id: id },
      limit,
      offset,
      order: [['id', 'ASC']],
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
}