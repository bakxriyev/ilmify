import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ example: 1 })
  student_id: number;

  @ApiProperty({ example: 1 })
  group_id: number;

  @ApiProperty({ example: 200000 })
  amount: number;

  @ApiProperty({ example: 5 })
  month: number;

  @ApiProperty({ example: 2026 })
  year: number;

  @ApiProperty({ required: false, example: 'naqt', description: 'To\'lov turi: click, naqt, karta, yarim_naqt_yarim_karta yoki boshqa matn' })
  payment_type?: string;

  @ApiProperty({ required: false, example: 50000, description: 'Naqt qismi (yarim_naqt_yarim_karta uchun)' })
  cash_amount?: number;

  @ApiProperty({ required: false, example: 150000, description: 'Karta qismi (yarim_naqt_yarim_karta uchun)' })
  card_amount?: number;

  @ApiProperty({ required: false, example: 'To\'lov qilindi' })
  note?: string;

  @ApiProperty({ required: false, example: 'paid' })
  status?: 'paid' | 'unpaid' | 'partial';

  @ApiProperty({ required: false, example: '2026-06-05' })
  paid_at?: string;
}
