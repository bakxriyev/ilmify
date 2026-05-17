import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEducationCenterDto {
  @ApiProperty({ example: 'ILM O\'quv Markazi' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Toshkent, Chilonzor', required: false })
  @IsString() @IsOptional()
  location?: string;

  @ApiProperty({ example: '+998901234567', required: false })
  @IsString() @IsOptional()
  phone?: string;

  @ApiProperty({ example: 0, required: false })
  @IsNumber() @IsOptional()
  balance?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean() @IsOptional()
  is_active?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  admin?: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    password: string;
  };
}
