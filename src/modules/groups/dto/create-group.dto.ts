import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ description: 'Guruh nomi', example: 'Advanced English A1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Asosiy teacher ID', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  teacher_id?: number;

  @ApiProperty({ description: 'Yordamchi teacher ID', example: 2, required: false })
  @IsNumber()
  @IsOptional()
  support_teacher_id?: number;

  @ApiProperty({ description: 'Level ID', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  level_id?: number;

  @ApiProperty({ description: 'Xona ID (darslarga biriktiriladi)', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  room_id?: number;

  // =================== Darslar uchun qoshimcha ===================
  @ApiProperty({ description: 'Dars boshlanish sanasi', example: '2026-01-30', required: false })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({ description: 'Dars davomiyligi oylar', example: 2, required: false })
  @IsOptional()
  @IsNumber()
  duration_months?: number;

  @ApiProperty({ description: 'Dars vaqti', example: '18:30', required: false })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiProperty({ description: 'Dars boshlanish vaqti', example: '14:00', required: false })
  @IsOptional()
  @IsString()
  start_time?: string;

  @ApiProperty({ description: 'Dars tugash vaqti', example: '15:30', required: false })
  @IsOptional()
  @IsString()
  end_time?: string;

  @ApiProperty({ description: 'Toq/juft hafta', example: 'odd', enum: ['odd','even'], required: false })
  @IsOptional()
  @IsEnum(['odd','even'])
  parity?: 'odd' | 'even';

  @ApiProperty({ description: 'Oylik tolov narxi', example: 200000, required: false })
  @IsOptional()
  @IsNumber()
  monthly_price?: number;

  @ApiProperty({ description: 'KP (koeffitsient)', example: 1.0, required: false })
  @IsOptional()
  @IsNumber()
  kp?: number;
}
