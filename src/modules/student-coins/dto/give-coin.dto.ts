import { ApiProperty } from '@nestjs/swagger';

export class GiveCoinTeacherDto {
  @ApiProperty()
  teacherId: number;

  @ApiProperty()
  studentId: number;

  @ApiProperty({
    example: 20,
  })
  coins: number;

  @ApiProperty({
    example: 'Faollik uchun',
  })
  reason?: string;
}