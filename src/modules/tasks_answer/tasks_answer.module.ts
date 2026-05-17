import { Module } from '@nestjs/common';
import { TasksAnswerService } from './tasks_answer.service';
import { TasksAnswerController } from './tasks_answer.controller';

@Module({
  controllers: [TasksAnswerController],
  providers: [TasksAnswerService],
})
export class TasksAnswerModule {}
