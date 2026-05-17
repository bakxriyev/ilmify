import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, IsJSON, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @ApiProperty({
    example: 1,
    description: 'Exercise ID (majburiy)',
    required: true,
  })
  @IsNotEmpty({ message: 'exercise_id bo‘sh bo‘lmasligi kerak' })
  @Type(() => Number)
  @IsInt({ message: 'exercise_id butun son bo‘lishi kerak' })
  exercise_id: number;

  @ApiProperty({
    example: 'Savol matni',
    description: 'Savol matni (ixtiyoriy)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'question_text matn bo‘lishi kerak' })
  question_text?: string;

  @ApiProperty({
    example: '/uploads/tasks/media_file.ext',
    description: 'Media fayl pathi (ixtiyoriy)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'media matn bo‘lishi kerak' })
  media?: string;

  @ApiProperty({
    example: 'To‘g‘ri javob',
    description: 'To‘g‘ri javob (majburiy)',
    required: true,
  })
  @IsNotEmpty({ message: 'correct_answer bo‘sh bo‘lmasligi kerak' })
  @IsString({ message: 'correct_answer matn bo‘lishi kerak' })
  correct_answer: string;

  @ApiProperty({
    example: '{ "hint": "Yordamchi ma‘lumot" }',
    description: 'Qo‘shimcha JSON ma‘lumotlar (ixtiyoriy)',
    required: false,
  })
  @IsOptional()
  @IsJSON({ message: 'extra_data JSON formatda bo‘lishi kerak' })
  extra_data?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Rasm fayl',
  })
  @IsOptional()
  photo?: any;

  @ApiProperty({
    example: 'Savol sarlavhasi',
    description: 'Savol sarlavhasi (ixtiyoriy)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'title matn bo‘lishi kerak' })
  title?: string;

  @ApiProperty({
    example: 'Savol tavsifi',
    description: 'Savol tavsifi (ixtiyoriy)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'description matn bo‘lishi kerak' })
  description?: string;

  @ApiProperty({
    example: 'Yozma savol matni',
    description: 'Yozma savol (ixtiyoriy)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'writing_q matn bo‘lishi kerak' })
  writing_q?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Audio fayl',
  })
  @IsOptional()
  audio?: any;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Video fayl',
  })
  @IsOptional()
  video?: any;

  @ApiProperty({
    example: 1,
    description: 'Tartib raqami (ixtiyoriy)',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ordinary_number butun son bo‘lishi kerak' })
  ordinary_number?: number;
}