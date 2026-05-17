import { IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DuplicateTaskDto {
  @ApiProperty({ description: 'Target exercise ID for duplicated task', example: 2 })
  @IsNumber()
  target_exercise_id: number;

  @ApiPropertyOptional({ description: 'Number of copies to create', example: 1 })
  @IsOptional()
  @IsNumber()
  count?: number = 1;
}