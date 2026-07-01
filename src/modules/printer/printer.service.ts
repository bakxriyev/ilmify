import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { PrinterModel } from './entities/printer.entity';
import { CreatePrinterDto, UpdatePrinterDto } from './dto/printer.dto';
import { EscposService, PrinterConfig } from '../receipt/escpos.service';

@Injectable()
export class PrinterService {
  private readonly logger = new Logger(PrinterService.name);

  constructor(
    @InjectModel(PrinterModel) private printerModel: typeof PrinterModel,
    private escposService: EscposService,
  ) {}

  async create(dto: CreatePrinterDto, center_id: number): Promise<PrinterModel> {
    if (dto.is_default) {
      await this.printerModel.update({ is_default: false }, { where: { center_id } });
    }
    return this.printerModel.create({ ...dto, center_id } as any);
  }

  async findAll(center_id: number): Promise<PrinterModel[]> {
    return this.printerModel.findAll({
      where: { center_id },
      order: [['is_default', 'DESC'], ['created_at', 'DESC']],
    });
  }

  async findOne(id: number, center_id: number): Promise<PrinterModel> {
    const printer = await this.printerModel.findOne({ where: { id, center_id } });
    if (!printer) throw new NotFoundException('Printer topilmadi');
    return printer;
  }

  async update(id: number, dto: UpdatePrinterDto, center_id: number): Promise<PrinterModel> {
    const printer = await this.findOne(id, center_id);
    if (dto.is_default) {
      await this.printerModel.update({ is_default: false }, { where: { center_id, id: { [Op.ne]: id } } });
    }
    await printer.update(dto as any);
    return printer.reload();
  }

  async remove(id: number, center_id: number): Promise<void> {
    const printer = await this.findOne(id, center_id);
    await printer.destroy();
  }

  async testPrinter(id: number, center_id: number): Promise<{ success: boolean; message: string }> {
    const printer = await this.findOne(id, center_id);
    const config = this.toConfig(printer);

    try {
      const connected = await this.escposService.testConnection(config);
      if (!connected) {
        return { success: false, message: 'Printerga ulanib bo\'lmadi' };
      }

      const testBuffer = this.escposService.generateTestPage(config);
      await this.escposService.printViaLAN(testBuffer as any, config);

      await printer.update({ last_connected_at: new Date() } as any);
      return { success: true, message: 'Printer muvaffaqiyatli test qilindi' };
    } catch (err: any) {
      return { success: false, message: `Xatolik: ${err.message}` };
    }
  }

  async getDefaultPrinter(center_id: number): Promise<PrinterModel | null> {
    return this.printerModel.findOne({
      where: { center_id, enabled: true },
      order: [['is_default', 'DESC'], ['created_at', 'DESC']],
    });
  }

  toConfig(printer: PrinterModel): PrinterConfig {
    return {
      connectionType: printer.connection_type as 'usb' | 'lan',
      ipAddress: printer.ip_address || undefined,
      port: printer.port || 9100,
      usbDeviceName: printer.usb_device_name || undefined,
      autoCut: printer.auto_cut,
      cashDrawer: printer.cash_drawer,
      receiptWidth: printer.receipt_width || 48,
      qrSize: printer.qr_size || 3,
    };
  }
}
