import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { StudentAnswerModel } from '../student-answer/model/student-answer.entity';
import { ExerciseResultModel } from './model/exercises_result.entity';
import { UnitResultService } from '../unit_result/unit_result.service';

@Injectable()
export class ExerciseResultService {
  constructor(
    @InjectModel(StudentAnswerModel)
    private studentAnswerRepo: typeof StudentAnswerModel,

    @InjectModel(ExerciseResultModel)
    private exerciseResultRepo: typeof ExerciseResultModel,

    private unitResultService: UnitResultService,
  ) {}

  // Task javobini saqlash va ExerciseResult yangilash
  async upsertTaskAnswer(
    student_id: number,
    unit_id: number,
    exercise_id: number,
    task_id: number,
    answer_text: any,
    is_correct: boolean,
    total_corrects: number,
    total_incorrects: number,
  ) {
    // Taskni saqlash
    const existingTask = await this.studentAnswerRepo.findOne({
      where: { student_id, exercise_id, task_id },
    });

    let task;
    if (existingTask) {
      task = await existingTask.update({
        answer_text,
        is_correct,
        answered_at: new Date(),
        total_corrects,
        total_incorrects,
        percentage: total_corrects + total_incorrects > 0 ? Math.round((total_corrects / (total_corrects + total_incorrects)) * 100) : 0,
      });
    } else {
      task = await this.studentAnswerRepo.create({
        student_id,
        unit_id,
        exercise_id,
        task_id,
        answer_text,
        is_correct,
        answered_at: new Date(),
        total_corrects,
        total_incorrects,
        percentage: total_corrects + total_incorrects > 0 ? Math.round((total_corrects / (total_corrects + total_incorrects)) * 100) : 0,
      });
    }

    // ExerciseResult real-time yangilash (to‘g‘ri hisoblash)
    await this.recalculateExerciseResult(student_id, unit_id, exercise_id);

    // Unit result yangilash
    await this.unitResultService.updateUnitResult(student_id, unit_id);

    return task;
  }

  // ✅ TO‘G‘RILANGAN: ExerciseResult ni tasklar bo‘yicha real-time hisoblash
  // Har bir task uchun eng yaxshi javobni olib, ularni yig‘adi.
  async recalculateExerciseResult(student_id: number, unit_id: number, exercise_id: number) {
    // 1. Barcha javoblarni olish
    const answers = await this.studentAnswerRepo.findAll({
      where: { student_id, exercise_id },
      order: [
        ['task_id', 'ASC'],
        ['total_corrects', 'DESC'],
        ['percentage', 'DESC'],  // bir xil total_corrects bo‘lsa, foiz yuqorirog‘i
      ],
    });

    if (!answers.length) return null;

    // 2. Har bir task uchun eng yaxshi javobni tanlash (birinchi uchragani – eng yaxshisi)
    const bestPerTask = new Map<number, StudentAnswerModel>();
    for (const ans of answers) {
      if (!bestPerTask.has(ans.task_id)) {
        bestPerTask.set(ans.task_id, ans);
      }
    }

    // 3. Yig‘indilarni hisoblash
    let totalCorrect = 0;
    let totalIncorrect = 0;
    bestPerTask.forEach((ans) => {
      totalCorrect += ans.total_corrects ?? 0;
      totalIncorrect += ans.total_incorrects ?? 0;
    });

    const totalTasks = bestPerTask.size;
    const totalBlanks = totalCorrect + totalIncorrect;
    const percentage = totalBlanks === 0 ? 0 : Math.round((totalCorrect / totalBlanks) * 100);

    // 4. ExerciseResult yozuvini yaratish/yangilash
    const [result] = await this.exerciseResultRepo.upsert({
      student_id,
      unit_id,
      exercise_id,
      percentage,
      totalCorrects: totalCorrect,
      totalIncorrects: totalIncorrect,
      totalTasks,
      updated_at: new Date(),
    });

    return result;
  }

  // GET exercise result – real-time qaytarish (endi to‘g‘ri ishlaydi)
  async getExerciseResult(student_id: number, exercise_id: number) {
    const tasks = await this.studentAnswerRepo.findAll({
      where: { student_id, exercise_id },
    });

    if (!tasks.length) throw new NotFoundException('Exercise natijasi topilmadi');

    const unit_id = tasks[0].unit_id;
    // Yangi to‘g‘ri hisoblash metodi chaqiriladi
    return this.recalculateExerciseResult(student_id, unit_id, exercise_id);
  }
}