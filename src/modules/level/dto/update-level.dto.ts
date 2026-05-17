import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLevelDto {
  @ApiProperty({ description: 'Level nomi', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Level sarlavhasi', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Level tavsifi', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}