import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateStudentAnswerDto {
  @IsNumber()
  student_id: number;

  @IsNumber()
  unit_id: number;

  @IsNumber()
  exercise_id: number;

  @IsNumber()
  task_id: number;

  @IsArray()
  @IsNotEmpty()
  answer_text: string[]; // array of strings for the task drags

  @IsString()
  q_type: string; // gap_fill, writing, etc.
}
