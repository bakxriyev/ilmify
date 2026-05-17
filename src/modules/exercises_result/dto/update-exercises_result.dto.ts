import { PartialType } from '@nestjs/mapped-types';
import { CreateExercisesResultDto } from './create-exercises_result.dto';

export class UpdateExercisesResultDto extends PartialType(CreateExercisesResultDto) {}
