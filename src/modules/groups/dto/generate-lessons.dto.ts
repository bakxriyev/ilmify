import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateLessonsDto {
  @ApiProperty({ description: 'Dars boshlanish sanasi (YYYY-MM-DD)' })
  @IsString()
  start_date: string;

  @ApiProperty({ description: 'Necha oy davom etishi' })
  @IsNumber()
  duration_months: number;

  @ApiProperty({ description: 'Dars vaqti (masalan: 14:00)' })
  @IsString()
  time: string;

  @ApiProperty({ description: 'Kunlar: odd (1,3,5) yoki even (2,4,6)' })
  @IsString()
  @IsIn(['odd', 'even'])
  parity: string;

  @ApiPropertyOptional({ description: 'Boshlanish vaqti' })
  @IsOptional()
  @IsString()
  start_time?: string;

  @ApiPropertyOptional({ description: 'Tugash vaqti' })
  @IsOptional()
  @IsString()
  end_time?: string;

  @ApiPropertyOptional({ description: 'Xona ID' })
  @IsOptional()
  @IsNumber()
  room_id?: number;
}
