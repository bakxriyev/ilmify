import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PrinterController } from './printer.controller';
import { PrinterService } from './printer.service';
import { PrinterModel } from './entities/printer.entity';
import { EscposService } from '../receipt/escpos.service';

@Module({
  imports: [SequelizeModule.forFeature([PrinterModel])],
  controllers: [PrinterController],
  providers: [PrinterService, EscposService],
  exports: [PrinterService, EscposService],
})
export class PrinterModule {}
