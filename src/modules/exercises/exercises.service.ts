import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { ExerciseModel } from './model/exercise.entity';
import { TaskModel } from '../tasks/model/task.entity';
import { UnitModel } from '../units/model/unit.entity';
import { ExerciseResultModel } from '../exercises_result/model/exercises_result.entity';
import { RedoIncorrectTaskModel } from '../redo-incorrect-task/model/redo-incorrect-task.entity';
import { CreateExerciseDto, UpdateExerciseDto, ExerciseQueryDto } from './dto';
import { StudentAnswerModel } from '../student-answer/model/student-answer.entity';

@Injectable()
export class ExerciseService {
  constructor(
    @InjectModel(ExerciseModel)
    private exerciseModel: typeof ExerciseModel,

    @InjectModel(TaskModel)
    private taskModel: typeof TaskModel,

    @InjectModel(UnitModel)
    private unitModel: typeof UnitModel,

    @InjectModel(ExerciseResultModel)
    private exerciseResultModel: typeof ExerciseResultModel,

    @InjectModel(RedoIncorrectTaskModel)
    private redoIncorrectTaskModel: typeof RedoIncorrectTaskModel,
  ) {}

  async create(dto: CreateExerciseDto) {
    const unit = await this.unitModel.findByPk(dto.unit_id);
    if (!unit) {
      throw new NotFoundException(`Unit #${dto.unit_id} topilmadi`);
    }

    // agar nomi unikallik talab qilsa, tekshirish
    // const existing = await this.exerciseModel.findOne({
    //   where: {
    //     unit_id: dto.unit_id,
    //     name: dto.name?.trim(),
    //   },
    // });

    return this.exerciseModel.create({
      unit_id: dto.unit_id,
      name: dto.name?.trim(),
      description: dto.description?.trim(),
      number: dto.number,
      type: dto.type,
      qText: dto.qText?.trim(),
    });
  }

  async findAll(query: ExerciseQueryDto) {
    const {
      page = 1,
      limit = 10,
      sort_by = 'name',
      sort_order = 'ASC',
      include_relations = false,
      unit_id,
      type,
      search,
    } = query;

    const offset = (page - 1) * limit;
    const where: any = {};

    if (unit_id) where.unit_id = unit_id;
    if (type) where.type = type;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { qText: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const include = include_relations
      ? [
          {
            model: TaskModel,
            required: false,
            attributes: ['id', 'title', 'description', 'ordinary_number'],
          },
          { model: ExerciseResultModel, required: false, limit: 5 },
          { model: RedoIncorrectTaskModel, required: false, limit: 5 },
        ]
      : [];

    const { count, rows } = await this.exerciseModel.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [[sort_by, sort_order]], // ✅ sort_order to‘g‘ridan-to‘g‘ri ishlatiladi (allaqachon uppercase)
      distinct: true,
    });

    const enriched = await Promise.all(
      rows.map(async (exercise) => {
        const [tasksCount, resultsCount] = await Promise.all([
          this.taskModel.count({ where: { exercise_id: exercise.id } }),
          this.exerciseResultModel.count({ where: { exercise_id: exercise.id } }),
        ]);

        return {
          ...exercise.toJSON(),
          tasks_count: tasksCount,
          results_count: resultsCount,
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

  async findOne(id: number, withRelations = true) {
    const include = withRelations
      ? [
          { model: UnitModel, attributes: ['id', 'name', 'title'] },
          { model: TaskModel, attributes: ['id', 'title', 'description', 'ordinary_number'] },
          { model: ExerciseResultModel, limit: 5 },
          { model: RedoIncorrectTaskModel, limit: 5 },
        ]
      : [];

    const exercise = await this.exerciseModel.findByPk(id, { include });

    if (!exercise) {
      throw new NotFoundException(`Exercise #${id} topilmadi`);
    }

    if (withRelations) {
      const [tasksCount, resultsCount] = await Promise.all([
        this.taskModel.count({ where: { exercise_id: id } }),
        this.exerciseResultModel.count({ where: { exercise_id: id } }),
      ]);

      return {
        ...exercise.toJSON(),
        tasks_count: tasksCount,
        results_count: resultsCount,
      };
    }

    return exercise;
  }

  async update(id: number, dto: UpdateExerciseDto) {
    const exercise = await this.exerciseModel.findByPk(id);
    if (!exercise) {
      throw new NotFoundException(`Exercise #${id} topilmadi`);
    }

    await exercise.update(dto);

    return this.findOne(id, false);
  }

  async delete(id: number) {
  const exercise = await this.exerciseModel.findByPk(id);
  if (!exercise) {
    throw new NotFoundException(`Exercise #${id} topilmadi`);
  }

  // Exercise ga tegishli tasklarni olish
  const tasks = await this.taskModel.findAll({
    where: { exercise_id: id },
  });

  const taskIds = tasks.map(t => t.id);

  // Student answerlardan task_id ni null qilish
  if (taskIds.length > 0) {
    await StudentAnswerModel.update(
      { task_id: null },
      { where: { task_id: taskIds } }
    );
  }

  // Exercise resultlarni o‘chirish
  await this.exerciseResultModel.destroy({
    where: { exercise_id: id },
  });

  // Tasklarni o‘chirish
  await this.taskModel.destroy({
    where: { exercise_id: id },
  });

  // Oxiri exercise ni o‘chiramiz
  await exercise.destroy();

  return {
    message: 'Exercise va unga bog‘langan barcha ma’lumotlar o‘chirildi',
    id,
  };
}

  async getExercisesByUnit(unitId: number) {
    const unit = await this.unitModel.findByPk(unitId);
    if (!unit) {
      throw new NotFoundException(`Unit #${unitId} topilmadi`);
    }

    return this.exerciseModel.findAll({
      where: { unit_id: unitId },
      order: [['number', 'ASC']],
      include: [{ model: TaskModel, required: false }],
    });
  }
}