// src/modules/exercises/exercise.module.ts
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ExerciseModel } from './model/exercise.entity';
import { ExerciseService } from './exercises.service';
import { ExerciseController } from './exercises.controller';
import { TaskModel } from '../tasks/model/task.entity';
import { UnitModel } from '../units/model/unit.entity';
import { ExerciseResultModel } from '../exercises_result/model/exercises_result.entity';
import { RedoIncorrectTaskModel } from '../redo-incorrect-task/model/redo-incorrect-task.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([
      ExerciseModel,
      TaskModel,
      UnitModel,
      ExerciseResultModel,
      RedoIncorrectTaskModel
    ]),
  ],
  controllers: [ExerciseController],
  providers: [ExerciseService],
  exports: [SequelizeModule]
})
export class ExerciseModule {}