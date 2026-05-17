import { IsNotEmpty, IsNumber, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupStudentDto {
  @ApiProperty({ description: 'Group ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  group_id: number;

  @ApiProperty({ description: 'Student ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  student_id: number;

  @ApiProperty({ description: 'Join date', example: '2024-01-15' })
  @IsDateString()
  @IsOptional()
  joined_date?: string;
}