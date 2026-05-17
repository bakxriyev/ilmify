import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, ValidateIf } from 'class-validator';

export class LikeStoryDto {
  @ApiProperty({ example: 1, description: 'Student ID', required: false })
  @IsOptional()
  @IsInt()
  student_id?: number;

  @ApiProperty({ example: 2, description: 'Teacher ID', required: false })
  @IsOptional()
  @IsInt()
  teacher_id?: number;
}