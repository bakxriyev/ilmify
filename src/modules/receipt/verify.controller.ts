import { Controller, Get, Param, NotFoundException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/sequelize';
import { ReceiptModel } from './entities/receipt.entity';
import { PaymentModel } from '../payments/entities/payment.entity';
import { StudentModel } from '../students/model/student.entity';
import { GroupModel } from '../groups/model/group.entity';

@ApiTags('Verify')
@Controller('verify')
export class VerifyController {
  private readonly logger = new Logger(VerifyController.name);

  constructor(
    @InjectModel(ReceiptModel) private receiptModel: typeof ReceiptModel,
  ) {}

  @Get(':receipt_number')
  @ApiOperation({ summary: 'Chekni tekshirish (public)' })
  async verify(@Param('receipt_number') receiptNumber: string) {
    const receipt = await this.receiptModel.findOne({
      where: { receipt_number: receiptNumber },
      include: [{
        model: PaymentModel,
        include: [
          { model: StudentModel, attributes: ['id', 'first_name', 'last_name', 'phone_number'] },
          { model: GroupModel, attributes: ['id', 'name'] },
        ],
      }],
    });

    if (!receipt) {
      throw new NotFoundException('Chek topilmadi');
    }

    const payment = (receipt as any).payment;
    const student = payment?.student;
    const group = payment?.group;

    return {
      valid: true,
      receipt_number: receipt.receipt_number,
      status: receipt.status,
      amount: Number(receipt.amount),
      discount: Number(receipt.discount),
      penalty: Number(receipt.penalty),
      total: Number(receipt.total),
      printed_at: receipt.printed_at,
      created_at: receipt.created_at,
      student: student ? {
        name: `${student.first_name} ${student.last_name}`,
        phone: student.phone_number,
      } : null,
      group: group?.name || null,
      payment_type: payment?.payment_type || null,
      paid_at: payment?.paid_at || null,
    };
  }
}
