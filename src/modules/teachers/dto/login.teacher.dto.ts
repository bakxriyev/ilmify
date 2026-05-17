import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginTeacherDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  phone_number: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  password: string;
}