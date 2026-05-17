import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { StudentAnswerService } from './student-answer.service';
import { StudentAnswerController } from './student-answer.controller';
import { StudentAnswerModel } from './model';
import { TaskModel } from '../tasks/model/task.entity';
import { ExerciseResultModel } from '../exercises_result/model/exercises_result.entity';
import { CoinsModule } from '../student-coins/student-coins.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      StudentAnswerModel,TaskModel,ExerciseResultModel]),CoinsModule
  ],
  controllers: [StudentAnswerController],
  providers: [StudentAnswerService],
  exports: [StudentAnswerService]
})
export class StudentAnswerModule {}