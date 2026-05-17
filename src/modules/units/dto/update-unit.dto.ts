import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUnitDto {
  @ApiPropertyOptional({
    example: 'Unit 2',
    description: 'Unit nomi',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: '2',
    description: 'Unit raqami',
  })
  @IsString()
  @IsOptional()
  unit_number?: string;

  @ApiPropertyOptional({
    example: 'Advanced topics',
    description: 'Unit sarlavhasi',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'This unit covers advanced topics',
    description: 'Unit tavsifi',
  })
  @IsString()
  @IsOptional()
  description?: string;

  
}
