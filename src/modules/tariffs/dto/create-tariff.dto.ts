import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTariffDto {
  @ApiProperty({ example: 'Boshlang\'ich' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  student_min: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  student_max: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  price_1month: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  price_3months: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  price_6months: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  price_12months: number;

  @ApiPropertyOptional({ example: 'Boshlang\'ich tarif' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
