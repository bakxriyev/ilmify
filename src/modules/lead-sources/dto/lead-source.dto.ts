import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeadSourceDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty({ example: 'instagram' }) @IsString() @IsNotEmpty() platform: string;
  @ApiProperty() @IsString() @IsNotEmpty() code: string;
}

export class UpdateLeadSourceDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() platform?: string;
  @ApiPropertyOptional() @IsOptional() is_active?: boolean;
}
