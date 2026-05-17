import { IsString, IsEmail, IsNotEmpty, IsOptional, MinLength, IsPhoneNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRole } from '../model/admin.entity';

export class CreateAdminDto {
  @ApiProperty({ 
    description: 'To‘liq ism va familiya', 
    example: 'Kamron Baxriyev' 
  })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ 
    description: 'Elektron pochta manzili', 
    example: 'kamron@example.com' 
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    description: 'Parol (kamida 6 ta belgidan iborat)', 
    example: 'strongpassword123', 
    minLength: 6 
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ 
    description: 'Profil rasmi URL', 
    example: 'https://example.com/photo.jpg' 
  })
  @IsString()
  @IsOptional()
  photo?: string;

  @ApiProperty({ 
    description: 'Telefon raqam (+998 XX XXX XX XX)', 
    example: '+998901234567' 
  })
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber()
  phone_number: string;

  @ApiPropertyOptional({
    description: 'Admin roli',
    example: 'admin',
    enum: ['admin', 'super_admin'],
  })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;
}

