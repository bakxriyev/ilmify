import {
  IsBoolean,
  IsDate,
  IsDecimal,
  IsInt,
  IsNotEmpty,
} from 'class-validator';

export class CreateUnitResultDto {
  @IsNotEmpty()
  @IsInt()
  student_id: number;

  @IsNotEmpty()
  @IsInt()
  unit_id: number;

  @IsInt()
  total_tasks: number;

  @IsInt()
  correct_tasks: number;

  @IsDecimal()
  tasks_percentage: number;
  
  percentage: number;

  @IsInt()
  total_vocabs: number;

  @IsInt()
  correct_vocabs: number;

  @IsDecimal()
  vocabs_percentage: number;

  @IsDecimal()
  overall_percentage: number;

  @IsBoolean()
  is_completed: boolean;

  @IsDate()
  completed_at: Date;
}
