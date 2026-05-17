import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RedoIncorrectTaskService } from './redo-incorrect-task.service';
import { RedoIncorrectTaskController } from './redo-incorrect-task.controller';
import { RedoIncorrectTaskModel } from './model';
import { StudentAnswerModel } from 'src/modules/student-answer/model/student-answer.entity';

@Module({
  imports: [SequelizeModule.forFeature([RedoIncorrectTaskModel ])],
  controllers: [RedoIncorrectTaskController],
  providers: [RedoIncorrectTaskService],
  exports: [RedoIncorrectTaskService],
})
export class RedoIncorrectTaskModule {}