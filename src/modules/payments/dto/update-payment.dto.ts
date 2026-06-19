import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../entities/payment.entity';

export class UpdatePaymentDto {
  @ApiPropertyOptional({ example: 200000 })
  amount?: number;

  @ApiPropertyOptional({ example: 'paid' })
  status?: PaymentStatus;

  @ApiPropertyOptional({ example: '2026-05-01' })
  paid_at?: string;

  @ApiPropertyOptional({ example: 'karta', description: 'To\'lov turi: click, naqt, karta yoki boshqa matn' })
  payment_type?: string;

  @ApiPropertyOptional({ example: 'To\'lov qayta tasdiqlandi' })
  note?: string;
}
