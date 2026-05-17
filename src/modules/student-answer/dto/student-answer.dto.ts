import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStudentAnswerDto {
  @ApiProperty({ description: 'Student ID' })
  @IsNumber()
  @IsNotEmpty()
  student_id: number;

  @ApiProperty({ description: 'Unit ID' })
  @IsNumber()
  @IsNotEmpty()
  unit_id: number;

  @ApiProperty({ description: 'Exercise ID' })
  @IsNumber()
  @IsNotEmpty()
  exercise_id: number;

  @ApiProperty({ description: 'Task ID' })
  @IsNumber()
  task_id: number;

  @ApiProperty({ description: 'Student javob matni' })
  @IsString()
  @IsNotEmpty()
  answer_text: string;

  @ApiProperty({ description: 'Javob to\'g\'riligi' })
  @IsBoolean()
  is_correct: boolean;

  @ApiProperty({ description: 'Urinish raqami', required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  attempt_number?: number;

  @ApiProperty({ description: 'Task tugallanganligi', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  is_completed?: boolean;
}

export class UpdateStudentAnswerDto {
  @ApiProperty({ description: 'Student javob matni', required: false })
  @IsOptional()
  @IsString()
  answer_text?: string;

  @ApiProperty({ description: 'Javob to\'g\'riligi', required: false })
  @IsOptional()
  @IsBoolean()
  is_correct?: boolean;

  @ApiProperty({ description: 'Urinish raqami', required: false })
  @IsOptional()
  @IsNumber()
  attempt_number?: number;

  @ApiProperty({ description: 'Task tugallanganligi', required: false })
  @IsOptional()
  @IsBoolean()
  is_completed?: boolean;

  @ApiProperty({ description: 'Task tugallanish sanasi', required: false })
  @IsOptional()
  @IsDateString()
  completed_at?: Date;
}

export class StudentAnswerQueryDto {
  @ApiProperty({ description: 'Student ID', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  student_id?: number;

  @ApiProperty({ description: 'Unit ID', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unit_id?: number;

  @ApiProperty({ description: 'Exercise ID', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  exercise_id?: number;

  @ApiProperty({ description: 'Task ID', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  task_id?: number;

  @ApiProperty({ description: 'Faqat to\'g\'ri javoblar', required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_correct?: boolean;

  @ApiProperty({ description: 'Faqat tugallangan tasklar', required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_completed?: boolean;

  @ApiProperty({ description: 'Sahifa raqami', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ description: 'Sahifadagi elementlar soni', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;
}

export class StudentAnswerResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  student_id: number;

  @ApiProperty()
  unit_id: number;

  @ApiProperty()
  exercise_id: number;

  @ApiProperty()
  task_id: number;

  @ApiProperty()
  answer_text: string;

  @ApiProperty()
  is_correct: boolean;

  @ApiProperty()
  attempt_number: number;

  @ApiProperty()
  is_completed: boolean;

  @ApiProperty()
  answered_at: Date;

  @ApiProperty()
  completed_at?: Date;

  @ApiProperty({ required: false })
  student?: any;

  @ApiProperty({ required: false })
  unit?: any;

  @ApiProperty({ required: false })
  exercise?: any;

  @ApiProperty({ required: false })
  task?: any;

  @ApiProperty({ required: false })
  redo_tasks?: any[];
}