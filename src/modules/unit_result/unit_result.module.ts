// src/modules/unit-result/unit-result.module.ts
import { Module,forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UnitResultModel } from './model/unit_result.entity';
import { UnitResultService } from './unit_result.service';
import { UnitResultController } from './unit_result.controller';
import { ExercisesResultModule } from '../exercises_result/exercises_result.module';
import { ExerciseResultModel } from '../exercises_result/model/exercises_result.entity';
import { ExerciseModel } from '../exercises/model/exercise.entity';
import { ExerciseModule } from '../exercises/exercises.module';

@Module({
  imports: [
    SequelizeModule.forFeature([UnitResultModel,ExerciseResultModel,ExerciseModel]),
     forwardRef(() => ExercisesResultModule),
    forwardRef(() => ExerciseModule),
  ],
  controllers: [UnitResultController],
  providers: [UnitResultService],
  exports: [UnitResultService],
})
export class UnitResultModule {}