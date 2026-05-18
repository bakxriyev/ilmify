import { IsNumber, IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupLessonDto {
  @ApiProperty({ description: 'Group ID' })
  @IsNumber()
  group_id: number;

  @ApiPropertyOptional({ description: 'Xona ID' })
  @IsOptional()
  @IsNumber()
  room_id?: number;

  @ApiPropertyOptional({ description: 'Unit ID' })
  @IsOptional()
  @IsNumber()
  unit_id?: number;

  @ApiProperty({ description: 'Dars sanasi', example: '2026-01-30' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Dars vaqti', example: '14:00' })
  @IsString()
  time: string;

  @ApiPropertyOptional({ description: 'Dars boshlanish vaqti', example: '14:00' })
  @IsOptional()
  @IsString()
  start_time?: string;

  @ApiPropertyOptional({ description: 'Dars tugash vaqti', example: '15:30' })
  @IsOptional()
  @IsString()
  end_time?: string;

  @ApiProperty({ description: 'Toq/juft hafta', enum: ['odd', 'even'] })
  @IsEnum(['odd', 'even'])
  parity: 'odd' | 'even';
}
