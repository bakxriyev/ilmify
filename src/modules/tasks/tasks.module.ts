import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TaskService } from './tasks.service';
import { TaskController } from './tasks.controller';
import { TaskModel } from './model/task.entity';
import { ExerciseModel } from '../exercises/model/exercise.entity';
@Module({
  imports: [
    SequelizeModule.forFeature([TaskModel,ExerciseModel])],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}