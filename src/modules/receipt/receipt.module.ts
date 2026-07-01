import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ReceiptController } from './receipt.controller';
import { VerifyController } from './verify.controller';
import { ReceiptService } from './receipt.service';
import { ReceiptModel } from './entities/receipt.entity';
import { ReceiptTemplateModel } from './entities/receipt-template.entity';
import { PaymentModel } from '../payments/entities/payment.entity';
import { StudentModel } from '../students/model/student.entity';
import { GroupModel } from '../groups/model/group.entity';
import { AcademySettingModel } from '../academy-settings/entities/academy-setting.entity';
import { PrinterModule } from '../printer/printer.module';

@Module({
  imports: [
    SequelizeModule.forFeature([ReceiptModel, ReceiptTemplateModel, PaymentModel, StudentModel, GroupModel, AcademySettingModel]),
    PrinterModule,
  ],
  controllers: [ReceiptController, VerifyController],
  providers: [ReceiptService],
  exports: [ReceiptService],
})
export class ReceiptModule {}
