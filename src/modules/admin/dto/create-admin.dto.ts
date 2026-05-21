import { IsString, IsEmail, IsNotEmpty, IsOptional, MinLength, IsPhoneNumber, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRole } from '../model/admin.entity';

export class CreateAdminDto {
  @ApiProperty({ 
    description: 'To‘liq ism va familiyasi', 
    example: 'Kamron Baxriyev' 
  })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ 
    description: 'Elektron pochta manzili', 
    example: 'kamronbahriyev@example.com' 
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    description: 'Parol (kamida 6 ta belgidan iborat)', 
    example: 'kamron123', 
    minLength: 6 
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ 
    description: 'Profil rasmi URL', 
    example: 'https://api.ilmify-edu.uz/photo' 
  })
  @IsString()
  @IsOptional()
  photo?: string;

  @ApiProperty({ 
    description: 'Telefon raqam (+998 XXX XX XX XX)', 
    example: '+998901234567' 
  })
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber()
  phone_number: string;

  @ApiPropertyOptional({
    description: 'Admin roli',
    example: 'admin',
    enum: ['admin', 'super_admin', 'director'],
  })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @ApiPropertyOptional({
    description: 'O\'quv markazi ID',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  center_id?: number;
}

