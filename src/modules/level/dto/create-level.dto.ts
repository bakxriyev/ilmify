import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLevelDto {
  @ApiProperty({ description: 'Level nomi' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Level sarlavhasi', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Level tavsifi', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}