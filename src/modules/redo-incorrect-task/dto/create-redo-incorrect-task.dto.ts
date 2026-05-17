// dto/create-redo-incorrect-task.dto.ts
import { IsNotEmpty, IsNumber, IsString, IsBoolean, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRedoIncorrectTaskDto {
  @ApiProperty({ description: 'Student ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  student_id: number;

  @ApiProperty({ description: 'Exercise ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  exercise_id: number;

  @ApiProperty({ description: 'Task ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  task_id: number;

  @ApiProperty({ description: 'Old answer ID (incorrect answer)', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  old_answer_id: number;

  @ApiProperty({ description: 'New answer text', example: 'The correct answer is 42' })
  @IsString()
  @IsNotEmpty()
  new_answer_text: string;

  @ApiProperty({ description: 'Is the new answer correct', example: true })
  @IsBoolean()
  @IsNotEmpty()
  is_correct: boolean;

  @ApiPropertyOptional({ description: 'Redo date', example: '2024-01-15T10:30:00Z' })
  @IsOptional()
  @IsDateString()
  redone_at?: string;
}