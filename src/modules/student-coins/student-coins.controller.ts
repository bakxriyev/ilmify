import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StudentCoinsService } from './student-coins.service';
import { GiveCoinTeacherDto } from './dto/give-coin.dto';
import { RewardTaskDto } from './dto/reward-task.dto';
import { RemoveCoinDto } from './dto/remove-coin.dto';

@ApiTags('Student Coins')
@Controller('student-coins')
export class StudentCoinsController {
  constructor(private readonly service: StudentCoinsService) {}

  // teacher coin
  @Post('teacher-give')
  giveCoinTeacher(@Body() dto: GiveCoinTeacherDto) {
    return this.service.giveCoinByTeacher(
      dto.teacherId,
      dto.studentId,
      dto.coins,
      dto.reason,
    );
  }

  // task reward
  @Post('task-reward')
  rewardTask(@Body() dto: RewardTaskDto) {
    return this.service.rewardTask(
      dto.studentId,
      dto.taskId,
      dto.coins,
      dto.reason,
    );
  }

  // remove coin
  @Post('remove')
  remove(@Body() dto: RemoveCoinDto) {
    return this.service.removeCoin(dto.studentId, dto.coins, dto.reason);
  }

  // balance
  @Get('balance/:studentId')
  balance(@Param('studentId') studentId: number) {
    return this.service.getBalance(studentId);
  }

  // all
  @Get()
  getAll() {
    return this.service.getAll();
  }

  // leaderboard
  @Get('leaderboard')
  leaderboard() {
    return this.service.leaderboard();
  }

  // teacher history
  @Get('teacher-history/:studentId')
  teacherHistory(@Param('studentId') studentId: number) {
    return this.service.teacherHistory(studentId);
  }

  // task history
  @Get('task-history/:studentId')
  taskHistory(@Param('studentId') studentId: number) {
    return this.service.taskHistory(studentId);
  }

  // full history
  @Get('history/:studentId')
  history(@Param('studentId') studentId: number) {
    return this.service.history(studentId);
  }

  // delete wallet
  @Delete(':studentId')
  delete(@Param('studentId') studentId: number) {
    return this.service.delete(studentId);
  }
}