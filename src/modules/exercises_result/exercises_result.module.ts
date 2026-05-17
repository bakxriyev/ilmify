import { Module,forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ExerciseResultService } from './exercises_result.service';
import { ExerciseResultController } from './exercises_result.controller';
import { ExerciseResultModel } from './model/exercises_result.entity';
import { StudentAnswerModel } from '../student-answer/model/student-answer.entity';
import { UnitResultModule } from '../unit_result/unit_result.module';
import { UnitResultModel } from '../unit_result/model/unit_result.entity';
import { ExerciseModel } from '../exercises/model/exercise.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([
      ExerciseResultModel,StudentAnswerModel]),
     forwardRef(() => UnitResultModule)],
  controllers: [ExerciseResultController],
  providers: [ExerciseResultService],
  exports: [ExerciseResultService],
})
export class ExercisesResultModule {}
