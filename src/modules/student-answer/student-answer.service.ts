import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { StudentAnswerModel } from './model/student-answer.entity';
import { TaskModel } from '../tasks/model/task.entity';
import { ExerciseResultModel } from '../exercises_result/model/exercises_result.entity';
import { StudentCoinsService } from '../student-coins/student-coins.service';

@Injectable()
export class StudentAnswerService {
  constructor(
    @InjectModel(StudentAnswerModel)
    private studentAnswerRepo: typeof StudentAnswerModel,

    @InjectModel(TaskModel)
    private taskRepo: typeof TaskModel,

    @InjectModel(ExerciseResultModel)
    private exerciseResultRepo: typeof ExerciseResultModel,

    private studentCoinsService: StudentCoinsService,
  ) {}

  // --- HELPER METHODS ---
  normalize(value: any): string {
    if (!value) return '';
    return String(value).trim().toLowerCase();
  }

  parseAnswer(answerText: any): any[] {
    try {
      const parsed =
        typeof answerText === 'string' ? JSON.parse(answerText) : answerText;
      return Object.values(parsed);
    } catch {
      return [];
    }
  }

  async checkAnswer(task: TaskModel, answerText: any, q_type: string) {
    const userParsed =
      typeof answerText === 'string' ? JSON.parse(answerText) : answerText;

    let correctAnswers: string[] = [];
    let incorrectAnswers: string[] = [];

    if (q_type === 'summary_c') {
      const userArray: any[] = Object.values(userParsed);

      const correctOrder: number[] =
        typeof task.correct_answer === 'string'
          ? JSON.parse(task.correct_answer)
          : task.correct_answer;

      const extra =
        typeof task.extra_data === 'string'
          ? JSON.parse(task.extra_data)
          : task.extra_data;

      const parts: string[] = extra.parts;
      const correctSequence = correctOrder.map((i) => parts[i]);

      for (let i = 0; i < correctSequence.length; i++) {
        const user = this.normalize(userArray[i]);
        const correct = this.normalize(correctSequence[i]);

        if (user === correct) {
          correctAnswers.push(userArray[i]);
        } else {
          incorrectAnswers.push(userArray[i] ?? null);
        }
      }
    }

    if (q_type === 'summary_d') {
      const userArray: any[] = Object.values(userParsed);

      const correctMap: Record<string, string> =
        typeof task.correct_answer === 'string'
          ? JSON.parse(task.correct_answer)
          : task.correct_answer;

      for (const key in correctMap) {
        const user = this.normalize(userArray[key]);
        const correct = this.normalize(correctMap[key]);

        if (user === correct) {
          correctAnswers.push(userArray[key]);
        } else {
          incorrectAnswers.push(userArray[key] ?? null);
        }
      }
    }

    // YANGI QOSHILDI
    if (q_type === 'summary_choice') {
      const correctMap: Record<string, string> =
        typeof task.correct_answer === 'string'
          ? JSON.parse(task.correct_answer)
          : task.correct_answer;

      for (const key in correctMap) {
        const user = this.normalize(userParsed?.[key]);
        const correct = this.normalize(correctMap[key]);

        if (user === correct) {
          correctAnswers.push(userParsed[key]);
        } else {
          incorrectAnswers.push(userParsed?.[key] ?? null);
        }
      }
    }
    if (q_type === 'summary_ing') {
  // Task correct answer
  let correct: string =
    typeof task.correct_answer === 'string'
      ? JSON.parse(task.correct_answer)
      : task.correct_answer;

  // User answer
  let userAnswer: string =
    typeof answerText === 'string' ? JSON.parse(answerText)?.answer : answerText?.answer;

  // Normalize: remove extra spaces and lowercase
  const normalizeText = (text: string) =>
    text
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const normalizedUser = normalizeText(userAnswer || '');
  const normalizedCorrect = normalizeText(correct || '');

  if (normalizedUser === normalizedCorrect) {
    correctAnswers.push(userAnswer);
  } else {
    incorrectAnswers.push(userAnswer || null);
  }
}

if (q_type === 'summary_no') {
  let correct: string =
    typeof task.correct_answer === 'string'
      ? JSON.parse(task.correct_answer)
      : task.correct_answer;

  let userAnswer: string =
    typeof answerText === 'string'
      ? JSON.parse(answerText)?.answer
      : answerText?.answer;

  const normalizeText = (text: string) =>
    String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const normalizedUser = normalizeText(userAnswer);
  const normalizedCorrect = normalizeText(correct);

  if (normalizedUser === normalizedCorrect) {
    correctAnswers.push(userAnswer);
  } else {
    incorrectAnswers.push(userAnswer ?? null);
  }
}

    const totalCorrects = correctAnswers.length;
    const totalIncorrects = incorrectAnswers.length;
    const totalBlanks = totalCorrects + totalIncorrects;
    const percentage =
      totalBlanks === 0 ? 0 : Math.round((totalCorrects / totalBlanks) * 100);

    return {
      totalCorrects,
      totalIncorrects,
      percentage,
      correctAnswers,
      incorrectAnswers,
    };
  }

  // --- CREATE STUDENT ANSWER ---
  async create(data: any) {
    const task = await this.taskRepo.findByPk(data.task_id);

    if (!task) throw new NotFoundException('Task topilmadi');

    const result = await this.checkAnswer(task, data.answer_text, data.q_type);

    // OLD BEST RESULT
    const bestOld = await this.studentAnswerRepo.findOne({
      where: {
        task_id: data.task_id,
        student_id: data.student_id,
      },
      order: [['total_corrects', 'DESC']],
    });

    const oldCorrects = bestOld?.total_corrects ?? 0;
    const newCorrects = result.totalCorrects;

    let newEarnedCorrects = 0;

    if (newCorrects > oldCorrects) {
      newEarnedCorrects = newCorrects - oldCorrects;
    }

    const coinAmount = newEarnedCorrects * 2;

    const saved = await this.studentAnswerRepo.create({
      ...data,
      total_corrects: result.totalCorrects,
      total_incorrects: result.totalIncorrects,
      percentage: result.percentage,
      is_correct: result.percentage === 100,
    });

    // COIN BERISH
    if (coinAmount > 0) {
      await this.studentCoinsService.rewardTask(
        data.student_id,
        data.task_id,
        coinAmount,
        `${newEarnedCorrects} ta yangi to'g'ri javob uchun`
      );
    }

    // 🔹 Real-time update for exercise
    await this.updateExerciseResultRealtime(
      data.student_id,
      data.exercise_id,
    );

    return {
      ...saved.toJSON(),
      coin_earned: coinAmount,
      new_correct_answers: newEarnedCorrects,
      correctAnswers: result.correctAnswers,
      incorrectAnswers: result.incorrectAnswers,
    };
  }

  // --- GET BEST RESULT FOR TASK ---
  async getBestResult(taskId: number, studentId: number) {
    const best = await this.studentAnswerRepo.findOne({
      where: { task_id: taskId, student_id: studentId },
      order: [['percentage', 'DESC']],
    });

    if (!best) throw new NotFoundException('Natija topilmadi');
    return best;
  }

  // --- REAL-TIME EXERCISE RESULT UPDATE ---
  async updateExerciseResultRealtime(studentId: number, exerciseId: number) {
    const tasks = await this.taskRepo.findAll({
      where: { exercise_id: exerciseId },
    });
    if (!tasks.length) return;

    let totalCorrects = 0;
    let totalIncorrects = 0;
    let unitId: number | null = null;

    for (const task of tasks) {
      const best = await this.studentAnswerRepo.findOne({
        where: { task_id: task.id, student_id: studentId },
        order: [['total_corrects', 'DESC']],
      });
      if (best) {
        totalCorrects += best.total_corrects ?? 0;
        totalIncorrects += best.total_incorrects ?? 0;
        if (!unitId) unitId = best.unit_id;
      }
    }

    const totalBlanks = totalCorrects + totalIncorrects;
    const finalPercentage =
      totalBlanks === 0
        ? 0
        : Math.round((totalCorrects / totalBlanks) * 100);

    const existing = await this.exerciseResultRepo.findOne({
      where: { student_id: studentId, exercise_id: exerciseId },
    });

    if (existing) {
      await existing.update({
        percentage: finalPercentage,
        totalCorrects,
        totalIncorrects,
        totalTasks: tasks.length,
        unit_id: unitId,
        updated_at: new Date(),
      });
    } else {
      await this.exerciseResultRepo.create({
        student_id: studentId,
        exercise_id: exerciseId,
        unit_id: unitId,
        percentage: finalPercentage,
        totalCorrects,
        totalIncorrects,
        totalTasks: tasks.length,
        completed_at: new Date(),
      });
    }

    return { totalCorrects, totalIncorrects, finalPercentage };
  }

  // --- GET EXERCISE RESULT ---
  async getExerciseResult(studentId: number, exerciseId: number) {
    const tasks = await this.taskRepo.findAll({
      where: { exercise_id: exerciseId },
    });

    if (!tasks.length)
      return {
        student_id: studentId,
        exercise_id: exerciseId,
        total_tasks: 0,
        total_percentage: 0,
      };

    let totalCorrects = 0;
    let totalIncorrects = 0;

    for (const task of tasks) {
      const best = await this.studentAnswerRepo.findOne({
        where: { task_id: task.id, student_id: studentId },
        order: [['total_corrects', 'DESC']],
      });

      if (best) {
        totalCorrects += best.total_corrects;
        totalIncorrects += best.total_incorrects;
      }
    }

    const totalTasks = tasks.length;
    const totalBlanks = totalCorrects + totalIncorrects;
    const totalPercentage =
      totalBlanks === 0
        ? 0
        : Math.round((totalCorrects / totalBlanks) * 100);

    return {
      student_id: studentId,
      exercise_id: exerciseId,
      total_tasks: totalTasks,
      total_corrects: totalCorrects,
      total_incorrects: totalIncorrects,
      total_percentage: totalPercentage,
    };
  }
}