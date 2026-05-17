import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class UnitQueryDto {
  @ApiProperty({ description: 'Unit nomi bo\'yicha qidiruv', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Tavsif bo\'yicha qidiruv', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Exercise bor/yo\'qligi', required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  has_exercises?: boolean;

  @ApiProperty({ description: 'Vocab bor/yo\'qligi', required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  has_vocabs?: boolean;

  @ApiProperty({ description: 'Sahifa raqami', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ description: 'Sahifadagi elementlar soni', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @ApiProperty({ description: 'Saralash turi', enum: ['title', 'id'], required: false, default: 'title' })
  @IsOptional()
  @IsString()
  sort_by?: 'title' | 'id' = 'title';

  @ApiProperty({ description: 'Saralash yo\'nalishi', enum: ['ASC', 'DESC'], required: false, default: 'ASC' })
  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC' = 'ASC';

  @ApiProperty({ description: 'Relations ham olinsinmi', required: false, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  include_relations?: boolean = false;

  @IsOptional()
  level_id:number;
}
