// dto/query-redo-incorrect-task.dto.ts
import { IsOptional, IsNumber, IsString, IsBoolean, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class QueryRedoIncorrectTaskDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Student ID filter', example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  student_id?: number;

  @ApiPropertyOptional({ description: 'Exercise ID filter', example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  exercise_id?: number;

  @ApiPropertyOptional({ description: 'Task ID filter', example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  task_id?: number;

  @ApiPropertyOptional({ description: 'Filter by correctness', example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  is_correct?: boolean;

  @ApiPropertyOptional({ description: 'Start date filter', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date filter', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Search in answer text', example: 'correct' })
  @IsOptional()
  @IsString()
  answer_text?: string;

  @ApiPropertyOptional({ 
    description: 'Include relations', 
    example: 'student,exercise,task',
    enum: ['student', 'exercise', 'task', 'old_answer']
  })
  @IsOptional()
  @IsString()
  include?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'redone_at',
    enum: ['redone_at', 'is_correct', 'student_id', 'exercise_id']
  })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC']
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC';
}