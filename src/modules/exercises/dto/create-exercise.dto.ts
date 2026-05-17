// src/modules/exercises/dto/create-exercise.dto.ts
import { IsString, IsOptional, IsInt, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ExerciseType {
  READING = 'reading',
  GAP_FILL = 'gap_fill',
  SPEAKING = 'speaking',
  WRITING = 'writing',
  LISTENING = 'listening',
  TEST = 'test',
  VOCABULARY = 'vocabulary',
  GRAMMAR = 'grammar',
  SUMMARY_D = 'summary_d',
  SUMMARY_C = 'summary_c',
  SUMMARY_CHOICE = 'summary_choice',
  SUMMARY_ING = 'summary_ing',
  SUMMARY_NO = 'summary_no'
}

export class CreateExerciseDto {
  @ApiProperty({ example: 1, description: 'Unit ID' })
  @IsInt()
  unit_id: number;

  @ApiProperty({ example: 'Reading Exercise 1', description: 'Mashq nomi (ixtiyoriy)' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Bu mashq o‘qish ko‘nikmasini rivojlantirish uchun', description: 'Tavsif (ixtiyoriy)' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 3, description: 'Mashq tartib raqami (ixtiyoriy)' })
  @IsInt()
  @IsOptional()
  number?: number;

  @ApiProperty({
    enum: ExerciseType,
    example: ExerciseType.READING,
    description: 'Mashq turi',
  })
  @IsEnum(ExerciseType)
  type: ExerciseType;

  @ApiProperty({ example: 'Asosiy savol matni', description: 'Asosiy savol (ixtiyoriy)' })
  @IsString()
  @IsOptional()
  qText?: string;
}
