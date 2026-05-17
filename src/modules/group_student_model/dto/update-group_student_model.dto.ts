// dto/update-group-student.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateGroupStudentDto } from './create-group_student_model.dto';

export class UpdateGroupStudentDto extends PartialType(CreateGroupStudentDto) {}

// dto/query-group-student.dto.ts
import { IsOptional, IsNumber, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

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
