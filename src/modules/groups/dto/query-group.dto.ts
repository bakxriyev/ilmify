
import { IsOptional, IsNumber, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class QueryGroupDto {
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

  @ApiPropertyOptional({ description: 'Teacher ID filter', example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  teacher_id?: number;

  @ApiPropertyOptional({ description: 'Support teacher ID filter', example: 2 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  support_teacher_id?: number;

  @ApiPropertyOptional({ description: 'Search by group name', example: 'Math' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Filter by day of week (0-6, 0=Sunday)', example: '1' })
  @IsOptional()
  @IsString()
  day?: string;

  @ApiPropertyOptional({ description: "Filter by parity: 'odd' | 'even' | 'both'", example: 'odd' })
  @IsOptional()
  @IsString()
  parity?: string;

  @ApiPropertyOptional({ description: 'Filter by start time from (HH:mm)', example: '08:00' })
  @IsOptional()
  @IsString()
  start_time_from?: string;

  @ApiPropertyOptional({ description: 'Filter by start time to (HH:mm)', example: '18:00' })
  @IsOptional()
  @IsString()
  start_time_to?: string;

  @ApiPropertyOptional({ 
    description: 'Include relations', 
    example: 'teacher,students',
    enum: ['teacher', 'support_teacher', 'students', 'group_students', 'attendances']
  })
  @IsOptional()
  @IsString()
  include?: string;
}