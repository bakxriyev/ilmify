import { IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TeacherCheckInDto {
  @ApiProperty({ example: 41.2995 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Kenglik (latitude) son bo\'lishi kerak' })
  @Min(-90, { message: 'Kenglik -90 dan kichik bo\'lishi mumkin emas' })
  @Max(90, { message: 'Kenglik 90 dan katta bo\'lishi mumkin emas' })
  latitude: number;

  @ApiProperty({ example: 69.2401 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Uzunlik (longitude) son bo\'lishi kerak' })
  @Min(-180, { message: 'Uzunlik -180 dan kichik bo\'lishi mumkin emas' })
  @Max(180, { message: 'Uzunlik 180 dan katta bo\'lishi mumkin emas' })
  longitude: number;
}
