// src/modules/teachers/dto/create-teacher.dto.ts
import { IsString, IsEmail, IsNotEmpty, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TeacherType } from '../model/teacher.model';

export class CreateTeacherDto {
  @ApiProperty({
    description: 'Teacher ismi',
    example: 'John',
    type: String,
  })
  @IsString()
  @IsOptional()
  first_name: string;

  @ApiProperty({
    description: 'Teacher familiyasi',
    example: 'Doe',
    type: String,
  })
  @IsString()
  @IsOptional()
  last_name: string;

  @ApiProperty({
    description: 'Teacher email manzili (unique)',
    example: 'john.doe@example.com',
    type: String,
  })
  @IsEmail()
  @IsNotEmpty()
  gmail: string;

  @ApiProperty({
    description: 'Teacher telefon raqami',
    example: '+998901234567',
    type: String,
  })
  @IsString()
  @IsOptional()
  phone_number: string;

  @ApiProperty({
    description: 'Teacher paroli (minimum 6 ta belgi)',
    example: 'password123',
    minLength: 6,
    type: String,
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

    @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  photo?: string;

  @ApiProperty({
    description: 'Teacher turi (SUPPORT yoki MAIN_TEACHER)',
    example: 'MAIN_TEACHER',
    enum: TeacherType,
    required: true,
  })
  @IsEnum(TeacherType)
  @IsNotEmpty()
  teacher_type: TeacherType;
}