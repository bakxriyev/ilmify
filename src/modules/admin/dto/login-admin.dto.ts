import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PhoneLoginDto {
  @ApiProperty({ 
    description: 'Telefon raqam yoki email', 
    example: '+998954546939' 
  })
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({ 
    description: 'Parol (kamida 6 ta belgidan iborat)', 
    example: 'strongpassword123', 
    minLength: 6 
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ 
    description: 'Login turi: "admin" yoki "super_admin"', 
    required: false,
    example: 'admin'
  })
  @IsOptional()
  @IsString()
  type?: string;
}
