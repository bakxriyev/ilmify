import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { StudentCoinsModel } from './entities/student-coin.entity';
import { TeacherCoinLogModel } from './entities/teacher-coin-log.entity';
import { TaskCoinLogModel } from './entities/task-coin-log.entity';

@Injectable()
export class StudentCoinsService {
  constructor(
    @InjectModel(StudentCoinsModel)
    private studentRepo: typeof StudentCoinsModel,

    @InjectModel(TeacherCoinLogModel)
    private teacherLogRepo: typeof TeacherCoinLogModel,

    @InjectModel(TaskCoinLogModel)
    private taskLogRepo: typeof TaskCoinLogModel,
  ) {}

  async getOrCreate(studentId: number) {
    let wallet = await this.studentRepo.findOne({
      where: { student_id: studentId },
    });

    if (!wallet) {
      wallet = await this.studentRepo.create({
        student_id: studentId,
        coins: 0,
        scores: 0,
      });
    }

    return wallet;
  }

  // TEACHER COIN
  async giveCoinByTeacher(
    teacherId: number,
    studentId: number,
    coins: number,
    reason?: string,
  ) {
    const wallet = await this.getOrCreate(studentId);

    await wallet.update({
      coins: wallet.coins + coins,
      scores: wallet.scores + coins,
    });

    await this.teacherLogRepo.create({
      teacher_id: teacherId,
      student_id: studentId,
      coins,
      reason,
    });

    return wallet;
  }

  // TASK REWARD
  async rewardTask(
    studentId: number,
    taskId: number,
    coins: number,
    reason?: string,
  ) {
    const wallet = await this.getOrCreate(studentId);

    await wallet.update({
      coins: wallet.coins + coins,
      scores: wallet.scores + coins,
    });

    await this.taskLogRepo.create({
      student_id: studentId,
      task_id: taskId,
      coins,
      reason,
    });

    return wallet;
  }

  // PENALTY
  async removeCoin(studentId: number, coins: number, reason: string) {
    const wallet = await this.getOrCreate(studentId);

    if (wallet.coins < coins) {
      throw new NotFoundException('Coin yetarli emas');
    }

    await wallet.update({
      coins: wallet.coins - coins,
    });

    await this.taskLogRepo.create({
      student_id: studentId,
      task_id: null,
      coins: -coins,
      reason,
    });

    return wallet;
  }

  // BALANCE
  async getBalance(studentId: number) {
    return this.getOrCreate(studentId);
  }

  // ALL WALLETS
  async getAll() {
    return this.studentRepo.findAll();
  }

  // LEADERBOARD
  async leaderboard() {
    return this.studentRepo.findAll({
      order: [['scores', 'DESC']],
      limit: 50,
    });
  }

  // TEACHER HISTORY
  async teacherHistory(studentId: number) {
    return this.teacherLogRepo.findAll({
      where: { student_id: studentId },
      order: [['createdAt', 'DESC']],
    });
  }

  // TASK HISTORY
  async taskHistory(studentId: number) {
    return this.taskLogRepo.findAll({
      where: { student_id: studentId },
      order: [['createdAt', 'DESC']],
    });
  }

  // FULL HISTORY
  async history(studentId: number) {
    const teacher = await this.teacherHistory(studentId);
    const tasks = await this.taskHistory(studentId);

    return {
      teacher,
      tasks,
    };
  }

  // DELETE WALLET
  async delete(studentId: number) {
    const wallet = await this.studentRepo.findOne({
      where: { student_id: studentId },
    });

    if (!wallet) throw new NotFoundException('Topilmadi');

    await wallet.destroy();
    return { message: 'Deleted' };
  }
}