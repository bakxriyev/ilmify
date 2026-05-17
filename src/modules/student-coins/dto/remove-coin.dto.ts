import { ApiProperty } from '@nestjs/swagger';

export class RemoveCoinDto {
  @ApiProperty()
  studentId: number;

  @ApiProperty({
    example: 5,
  })
  coins: number;

  @ApiProperty({
    example: 'Darsga kelmadi',
  })
  reason: string;
}