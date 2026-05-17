import { IsOptional, IsInt, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ExerciseQueryDto {
  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({ example: 'name', required: false })
  @IsOptional()
  @IsString()
  sort_by?: string = 'name';

  @ApiProperty({ enum: ['ASC', 'DESC'], required: false })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC' = 'ASC'; // ✅ faqat katta harf

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean) // ✅ string 'true' → boolean true
  include_relations?: boolean = false;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  unit_id?: number;

  @ApiProperty({
    enum: ['reading', 'gap_fill', 'speaking', 'writing', 'listening', 'test', 'vocabulary', 'grammar'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['reading', 'gap_fill', 'speaking', 'writing', 'listening', 'test', 'vocabulary', 'grammar'])
  type?: string;

  @ApiProperty({ example: 'search term', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}