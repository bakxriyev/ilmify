import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class StudentParamDto {
  @ApiProperty({
    example: 29,
  })
  @IsNumber()
  studentId: number;
}