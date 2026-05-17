// unit.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UnitService } from './units.service';
import { UnitController } from './units.controller';
import { UnitModel } from './model/unit.entity';
import { ExerciseModel } from '../exercises/model/exercise.entity';
import { VocabModel } from '../vocabulary/model/vocabulary.entity';
import { StudentAnswerModel } from '../student-answer/model/student-answer.entity';
import { ExerciseResultModel } from '../exercises_result/model/exercises_result.entity';
import { UnitResultModel } from '../unit_result/model/unit_result.entity';
import { VocabResultModel } from '../vocab_result/model/vocab_result.entity';
import { StudentModel } from '../students/model/student.entity';
import { LevelModel } from '../level/model/level.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([
      UnitModel,
      VocabModel,
      ExerciseModel,
      StudentAnswerModel,
      ExerciseResultModel,
      UnitResultModel,
      VocabResultModel,
      StudentModel,
      LevelModel
    ])],
  controllers: [UnitController],
  providers: [UnitService],
  exports: [UnitService]
})
export class UnitModule {}