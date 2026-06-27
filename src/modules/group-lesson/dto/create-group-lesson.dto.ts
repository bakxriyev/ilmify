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

  @ApiProperty({ description: 'Toq/juft/kunlik hafta', enum: ['odd', 'even', 'everyday'] })
  @IsEnum(['odd', 'even', 'everyday'])
  parity: 'odd' | 'even' | 'everyday';

  @ApiPropertyOptional({ description: 'Har kunlik uchun: mon-fri (Dush-Juma) yoki mon-sat (Dush-Shanba)', enum: ['mon-fri', 'mon-sat'] })
  @IsOptional()
  @IsString()
  weekdays?: 'mon-fri' | 'mon-sat';
}
