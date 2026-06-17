import { IsInt } from 'class-validator';

export class CreateExerciseResultDto {
  @IsInt()
  student_id: number;

  @IsInt()
  unit_id: number;

  @IsInt()
  
  exercise_id: number;
}
