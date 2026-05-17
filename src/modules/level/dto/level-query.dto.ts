import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LevelQueryDto {
  @ApiProperty({ description: 'Sahifa raqami', required: false, default: 1 })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Limit', required: false, default: 10 })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({ description: 'Saralash maydoni', required: false, default: 'name' })
  @IsOptional()
  @IsString()
  sort_by?: string = 'name';

  @ApiProperty({ description: 'Saralash tartibi', required: false, enum: ['ASC', 'DESC'], default: 'ASC' })
  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC' = 'ASC';

  @ApiProperty({ description: 'Filtr: name bo\'yicha', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Filtr: description bo\'yicha', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}