import { ApiProperty } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiProperty({ example: 50000 })
  amount: number;

  @ApiProperty({ example: 'Kanselyariya uchun' })
  description: string;

  @ApiProperty({ example: '2026-07-01' })
  date: string;
}
