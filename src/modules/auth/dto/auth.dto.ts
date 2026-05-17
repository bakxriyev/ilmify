// student-auth.dto.ts
import { IsString, IsNotEmpty, IsEmail, IsOptional, MinLength } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class StudentLoginDto {
  @ApiProperty({ example: '+998954546939' })
  phone_number: string;

  @ApiProperty({ example: 'kamron123' })
  password: string;
}
export class RefreshTokenDto {
  refresh_token: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  new_password: string;
}

export class SetPhotoDto {
  @IsOptional()
  photo?: Express.Multer.File;
}