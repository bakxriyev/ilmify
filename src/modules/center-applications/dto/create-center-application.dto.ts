import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCenterApplicationDto {
  @ApiProperty({ description: 'O\'quv markaz nomi' })
  @IsString()
  @IsNotEmpty()
  center_name: string;

  @ApiProperty({ description: 'To\'liq ism' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ description: 'Telefon raqam' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Viloyat' })
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiPropertyOptional({ description: 'Batafsil ma\'lumot' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateApplicationStatusDto {
  @ApiProperty({ enum: ['new', 'contacted', 'approved', 'rejected'] })
  @IsString()
  @IsNotEmpty()
  status: string;
}
