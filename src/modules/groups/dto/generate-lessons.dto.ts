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

  @ApiProperty({ description: 'Kunlar: odd (1,3,5), even (2,4,6), everyday (har kunlik)' })
  @IsString()
  @IsIn(['odd', 'even', 'everyday'])
  parity: string;

  @ApiPropertyOptional({ description: 'Har kunlik uchun: mon-fri (Dush-Juma) yoki mon-sat (Dush-Shanba)', enum: ['mon-fri', 'mon-sat'] })
  @IsOptional()
  @IsString()
  weekdays?: 'mon-fri' | 'mon-sat';

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
