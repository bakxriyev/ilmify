import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEducationCenterDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() location?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() balance?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() is_active?: boolean;
  @ApiPropertyOptional() @IsNumber() @IsOptional() tariff_id?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() call_center_enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() features?: Record<string, boolean>;
}
