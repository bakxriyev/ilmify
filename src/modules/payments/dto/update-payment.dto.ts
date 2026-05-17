import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../entities/payment.entity';

export class UpdatePaymentDto {
  @ApiPropertyOptional({ example: 200000 })
  amount?: number;

  @ApiPropertyOptional({ example: 'paid' })
  status?: PaymentStatus;

  @ApiPropertyOptional({ example: '2026-05-01' })
  paid_at?: string;

  @ApiPropertyOptional({ example: 'To\'lov qayta tasdiqlandi' })
  note?: string;
}
