import { IsOptional, IsNumber, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateGroupStudentDto {
  @ApiPropertyOptional({ description: 'Group ID', example: 1 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : value))
  @IsNumber()
  group_id?: number;

  @ApiPropertyOptional({ description: 'Student ID', example: 1 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : value))
  @IsNumber()
  student_id?: number;

  @ApiPropertyOptional({ description: 'Join date', example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  joined_date?: string;
}

export class QueryGroupStudentDto {
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

  @ApiPropertyOptional({ description: 'Group ID filter', example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  group_id?: number;

  @ApiPropertyOptional({ description: 'Student ID filter', example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  student_id?: number;

  @ApiPropertyOptional({ description: 'Search by student name', example: 'John' })
  @IsOptional()
  @IsString()
  student_name?: string;

  @ApiPropertyOptional({ description: 'Search by group name', example: 'Math Group' })
  @IsOptional()
  @IsString()
  group_name?: string;
}
