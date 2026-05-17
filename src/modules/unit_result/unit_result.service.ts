import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ExerciseResultModel } from '../exercises_result/model/exercises_result.entity';
import { UnitResultModel } from './model/unit_result.entity';
import { ExerciseModel } from '../exercises/model/exercise.entity';

@Injectable()
export class UnitResultService {
  constructor(
    @InjectModel(UnitResultModel)
    private unitResultRepo: typeof UnitResultModel,

    @InjectModel(ExerciseResultModel)
    private exerciseResultRepo: typeof ExerciseResultModel,

    @InjectModel(ExerciseModel)
    private exerciseRepo: typeof ExerciseModel,
  ) {}

  // ================= Unit real-time =================
  async updateUnitResult(studentId: number, unitId: number) {
    const exercises = await this.exerciseRepo.findAll({ where: { unit_id: unitId } });
    if (!exercises.length) return null;

    let totalPercentage = 0;
    let count = 0;

    for (const exercise of exercises) {
      const exerciseResult = await this.exerciseResultRepo.findOne({
        where: { student_id: studentId, exercise_id: exercise.id },
      });
      if (exerciseResult) {
        totalPercentage += exerciseResult.percentage;
        count++;
      }
    }

    const finalPercentage = count === 0 ? 0 : Math.round(totalPercentage / count);

    const existing = await this.unitResultRepo.findOne({
      where: { student_id: studentId, unit_id: unitId },
    });

    if (existing) {
      return existing.update({
        percentage: finalPercentage,
        is_completed: finalPercentage === 100,
        completed_at: new Date(),
      });
    }

    return this.unitResultRepo.create({
      student_id: studentId,
      unit_id: unitId,
      percentage: finalPercentage,
      is_completed: finalPercentage === 100,
      completed_at: new Date(),
    });
  }

  async getUnitResult(studentId: number, unitId: number) {
    const exercises = await this.exerciseRepo.findAll({ where: { unit_id: unitId } });
    if (!exercises.length) throw new NotFoundException('Unitdagi exercises topilmadi');

    let totalPercentage = 0;
    let count = 0;

    for (const exercise of exercises) {
      const exerciseResult = await this.exerciseResultRepo.findOne({
        where: { student_id: studentId, exercise_id: exercise.id },
      });
      if (exerciseResult) {
        totalPercentage += exerciseResult.percentage;
        count++;
      }
    }

    if (count === 0) throw new NotFoundException('Studentning unit natijalari topilmadi');

    const finalPercentage = Math.round(totalPercentage / count);

    return {
      student_id: studentId,
      unit_id: unitId,
      exercises_count: exercises.length,
      counted_exercises: count,
      percentage: finalPercentage,
    };
  }
}