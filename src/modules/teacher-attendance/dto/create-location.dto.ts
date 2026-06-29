import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeacherAttendanceLocationDto {
  @ApiProperty({ example: 'Asosiy xona' })
  @IsString({ message: 'Lokatsiya nomi matn bo\'lishi kerak' })
  name: string;

  @ApiProperty({ example: 41.2995 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Kenglik son bo\'lishi kerak' })
  @Min(-90, { message: 'Kenglik -90 dan kichik bo\'lishi mumkin emas' })
  @Max(90, { message: 'Kenglik 90 dan katta bo\'lishi mumkin emas' })
  latitude: number;

  @ApiProperty({ example: 69.2401 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Uzunlik son bo\'lishi kerak' })
  @Min(-180, { message: 'Uzunlik -180 dan kichik bo\'lishi mumkin emas' })
  @Max(180, { message: 'Uzunlik 180 dan katta bo\'lishi mumkin emas' })
  longitude: number;

  @ApiPropertyOptional({ example: 'Toshkent, Chilonzor 12' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Radius son bo\'lishi kerak' })
  @Min(10, { message: 'Radius kamida 10 metr bo\'lishi kerak' })
  @Max(10000, { message: 'Radius ko\'pi bilan 10000 metr bo\'lishi mumkin' })
  radius?: number;
}
