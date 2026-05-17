import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUnitDto {
  @ApiProperty({
    example: 'Unit 1',
    description: 'Unit nomi',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '1',
    description: 'Unit raqami (string ko‘rinishda)',
  })
  @IsString()
  @IsNotEmpty()
  unit_number: string;

  @ApiProperty({
    example: 'Introduction',
    description: 'Unit sarlavhasi',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: 'This unit covers basic topics',
    description: 'Unit tavsifi',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: "1",
    description: 'level_id ',
    required: false,
  })
  @IsString()
  @IsOptional()
  level_id?: number;
}
