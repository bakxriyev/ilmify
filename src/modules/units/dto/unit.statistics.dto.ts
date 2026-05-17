import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';


export class UnitStatisticsDto {
  @ApiProperty()
  unit_id: number;

   @ApiProperty()
  level_id?: number;

  @ApiProperty()
  unit_title: string;

  @ApiProperty()
  total_exercises: number;

  @ApiProperty()
  total_vocabs: number;

  @ApiProperty()
  total_students_attempted: number;

  @ApiProperty()
  total_answers: number;

  @ApiProperty()
  correct_answers: number;

  @ApiProperty()
  accuracy_rate: string;

  @ApiProperty()
  completed_students: number;

  @ApiProperty()
  completion_rate: string;

  @ApiProperty()
  average_score: string;
}