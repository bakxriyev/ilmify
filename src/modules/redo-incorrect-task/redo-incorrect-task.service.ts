// redo-incorrect-task.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { RedoIncorrectTaskModel } from './model';
import { StudentModel } from 'src/modules/students';
import { ExerciseModel } from 'src/modules/exercises/model/exercise.entity';
import { TaskModel } from 'src/modules/tasks/model/task.entity';
import { StudentAnswerModel } from 'src/modules/student-answer/model/student-answer.entity';

import { QueryRedoIncorrectTaskDto } from './dto/query-redo';

import { Op } from 'sequelize';

@Injectable()
export class RedoIncorrectTaskService {
  constructor(
    @InjectModel(RedoIncorrectTaskModel)
    private readonly redoIncorrectTaskModel: typeof RedoIncorrectTaskModel,
  ) {}

 

  async findAll(queryDto: QueryRedoIncorrectTaskDto) {
    const { 
      page, 
      limit, 
      student_id, 
      exercise_id, 
      task_id, 
      is_correct, 
      start_date, 
      end_date, 
      answer_text,
      include,
      sort_by = 'redone_at',
      sort_order = 'DESC'
    } = queryDto;
    
    const offset = (page - 1) * limit;

    const whereClause: any = {};
    
    if (student_id) {
      whereClause.student_id = student_id;
    }

    if (exercise_id) {
      whereClause.exercise_id = exercise_id;
    }

    if (task_id) {
      whereClause.task_id = task_id;
    }

    if (typeof is_correct === 'boolean') {
      whereClause.is_correct = is_correct;
    }

    if (start_date || end_date) {
      whereClause.redone_at = {};
      if (start_date) {
        whereClause.redone_at[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        whereClause.redone_at[Op.lte] = new Date(end_date);
      }
    }

    if (answer_text) {
      whereClause.new_answer_text = { [Op.iLike]: `%${answer_text}%` };
    }

    const includeArray = this.buildIncludeArray(include);

    const { count, rows } = await this.redoIncorrectTaskModel.findAndCountAll({
      where: whereClause,
      include: includeArray,
      limit,
      offset,
      order: [[sort_by, sort_order]],
    });

    return {
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async findOne(id: number, include?: string): Promise<RedoIncorrectTaskModel> {
    const includeArray = this.buildIncludeArray(include);

    const redoTask = await this.redoIncorrectTaskModel.findByPk(id, {
      include: includeArray,
    });

    if (!redoTask) {
      throw new NotFoundException(`Redo incorrect task with ID ${id} not found`);
    }

    return redoTask;
  }

  async findByStudent(studentId: number): Promise<RedoIncorrectTaskModel[]> {
    return await this.redoIncorrectTaskModel.findAll({
      where: { student_id: studentId },
      include: [
        { model: ExerciseModel, as: 'exercise' },
        { model: TaskModel, as: 'task' },
        { model: StudentAnswerModel, as: 'old_answer' },
      ],
      order: [['redone_at', 'DESC']],
    });
  }

  async findByExercise(exerciseId: number): Promise<RedoIncorrectTaskModel[]> {
    return await this.redoIncorrectTaskModel.findAll({
      where: { exercise_id: exerciseId },
      include: [
        { model: StudentModel, as: 'student' },
        { model: TaskModel, as: 'task' },
        { model: StudentAnswerModel, as: 'old_answer' },
      ],
      order: [['redone_at', 'DESC']],
    });
  }

  async findByTask(taskId: number): Promise<RedoIncorrectTaskModel[]> {
    return await this.redoIncorrectTaskModel.findAll({
      where: { task_id: taskId },
      include: [
        { model: StudentModel, as: 'student' },
        { model: ExerciseModel, as: 'exercise' },
        { model: StudentAnswerModel, as: 'old_answer' },
      ],
      order: [['redone_at', 'DESC']],
    });
  }



  async remove(id: number): Promise<void> {
    const redoTask = await this.findOne(id);
    await redoTask.destroy();
  }

 

  async getStudentRedoStats(studentId: number) {
    const totalRedos = await this.redoIncorrectTaskModel.count({
      where: { student_id: studentId },
    });

    const correctRedos = await this.redoIncorrectTaskModel.count({
      where: { 
        student_id: studentId,
        is_correct: true 
      },
    });

    const recentRedos = await this.redoIncorrectTaskModel.count({
      where: {
        student_id: studentId,
        redone_at: {
          [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    const improvementRate = totalRedos > 0 ? (correctRedos / totalRedos) * 100 : 0;

    return {
      studentId,
      totalRedos,
      correctRedos,
      incorrectRedos: totalRedos - correctRedos,
      recentRedos,
      improvementRate: Math.round(improvementRate * 100) / 100,
    };
  }

  async getExerciseRedoStats(exerciseId: number) {
    const totalRedos = await this.redoIncorrectTaskModel.count({
      where: { exercise_id: exerciseId },
    });

    const correctRedos = await this.redoIncorrectTaskModel.count({
      where: { 
        exercise_id: exerciseId,
        is_correct: true 
      },
    });

    const uniqueStudents = await this.redoIncorrectTaskModel.count({
      where: { exercise_id: exerciseId },
      distinct: true,
      col: 'student_id',
    });

    const mostRedoneTask = await this.redoIncorrectTaskModel.findOne({
      where: { exercise_id: exerciseId },
      attributes: [
        'task_id',
        [this.redoIncorrectTaskModel.sequelize.fn('COUNT', '*'), 'redo_count']
      ],
      group: ['task_id'],
      order: [[this.redoIncorrectTaskModel.sequelize.literal('redo_count'), 'DESC']],
      include: [{ model: TaskModel, as: 'task' }],
    });

    return {
      exerciseId,
      totalRedos,
      correctRedos,
      incorrectRedos: totalRedos - correctRedos,
      uniqueStudents,
      mostRedoneTask: mostRedoneTask ? {
        taskId: mostRedoneTask.task_id,
        redoCount: mostRedoneTask.get('redo_count'),
      } : null,
      successRate: totalRedos > 0 ? Math.round((correctRedos / totalRedos) * 100 * 100) / 100 : 0,
    };
  }

  private async checkAnswerCorrectness(taskId: number, answerText: string): Promise<boolean> {
    // TODO: Implement actual answer checking logic
    // This could involve:
    // 1. Comparing with stored correct answers
    // 2. Using an AI service to evaluate the answer
    // 3. Pattern matching for specific answer types
    
    // For now, return a placeholder - you should implement actual logic
    return answerText.toLowerCase().includes('correct') || answerText.length > 10;
  }

  private buildIncludeArray(include?: string) {
    if (!include) {
      return [];
    }

    const includeItems = include.split(',');
    const includeArray = [];

    if (includeItems.includes('student')) {
      includeArray.push({ model: StudentModel, as: 'student' });
    }

    if (includeItems.includes('exercise')) {
      includeArray.push({ model: ExerciseModel, as: 'exercise' });
    }

    if (includeItems.includes('task')) {
      includeArray.push({ model: TaskModel, as: 'task' });
    }

    if (includeItems.includes('old_answer')) {
      includeArray.push({ model: StudentAnswerModel, as: 'old_answer' });
    }

    return includeArray;
  }
}