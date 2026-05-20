import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEducationCenterDto {
  @ApiProperty({ example: "ILM O'quv Markazi" })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Toshkent, Chilonzor' })
  @IsString() @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsString() @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean() @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber() @IsOptional()
  tariff_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Necha oylik: 1, 3, 6, 12' })
  @IsNumber() @IsOptional() @Min(1)
  tariff_duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  admin?: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    password: string;
  };
}
