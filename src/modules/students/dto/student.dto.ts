import { IsString, IsEmail, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty({ example: 'Kamron' })
  @IsString()
  first_name: string;

  @ApiProperty({ example: 'Baxriyev' })
  @IsString()
  last_name: string;

  @ApiProperty({ example: 18 })
  @IsOptional()
  age: number;

  @ApiProperty({ example: 'ali.karimov@gmail.com', required: false })
  @IsOptional()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+998954546939' })
  @IsString()
  phone_number: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ example: 'kamron123' })
  @IsString()
  password: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @IsOptional()
  group_id: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Ota-onaning ismi' })
  @IsOptional()
  @IsString()
  parent_first_name?: string;

  @ApiPropertyOptional({ description: 'Ota-onaning familiyasi' })
  @IsOptional()
  @IsString()
  parent_last_name?: string;

  @ApiPropertyOptional({ description: 'Ota-onaning telefon raqami' })
  @IsOptional()
  @IsString()
  parent_phone_number?: string;

  @ApiPropertyOptional({ description: 'Ota-onaning paroli' })
  @IsOptional()
  @IsString()
  parent_password?: string;
}

export class UpdateStudentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  age?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  group_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parent_first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parent_last_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parent_phone_number?: string;
}

export class UpdateStudentPasswordDto {
  @ApiProperty()
  old_password: string;

  @ApiProperty()
  new_password: string;
}

export class StudentQueryDto {
  @ApiPropertyOptional()
  page?: string;

  @ApiPropertyOptional()
  limit?: string;

  @ApiPropertyOptional()
  sort_by?: string;

  @ApiPropertyOptional()
  sort_order?: string;

  @ApiPropertyOptional()
  first_name?: string;

  @ApiPropertyOptional()
  last_name?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone_number?: string;

  @ApiPropertyOptional()
  search?: string;

  @ApiPropertyOptional()
  group_id?: string;

  @ApiPropertyOptional()
  min_age?: string;

  @ApiPropertyOptional()
  max_age?: string;

  @ApiPropertyOptional()
  phone_number_empty?: string;
}

export class StudentResponseDto {
  id: number;
  first_name: string;
  last_name: string;
  age: number;
  email: string;
  phone_number: string;
  photo?: string;
  group_id?: number;
  isActive: boolean;
  group?: any;
  parent_links?: any[];
}

export class BulkCreateStudentDto {
  @ApiProperty({ type: [CreateStudentDto] })
  students: CreateStudentDto[];
}

export class AssignToGroupDto {
  @ApiProperty()
  group_id: number;

  @ApiProperty({ type: [Number] })
  student_ids: number[];
}
