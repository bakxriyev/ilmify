import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import { ReceiptModel, ReceiptStatus } from './entities/receipt.entity';
import { ReceiptTemplateModel } from './entities/receipt-template.entity';
import { PrintReceiptDto, ReprintReceiptDto } from './dto/create-receipt.dto';
import { EscposService, ReceiptData, PrinterConfig } from './escpos.service';
import { PrinterService } from '../printer/printer.service';
import { PaymentModel, PaymentStatus } from '../payments/entities/payment.entity';
import { StudentModel } from '../students/model/student.entity';
import { GroupModel } from '../groups/model/group.entity';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';
import { AdminModel } from '../admin/model/admin.entity';
import { AcademySettingModel } from '../academy-settings/entities/academy-setting.entity';

const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);
  private receiptCounter = 0;

  constructor(
    @InjectModel(ReceiptModel) private receiptModel: typeof ReceiptModel,
    @InjectModel(ReceiptTemplateModel) private templateModel: typeof ReceiptTemplateModel,
    @InjectModel(PaymentModel) private paymentModel: typeof PaymentModel,
    @InjectModel(StudentModel) private studentModel: typeof StudentModel,
    @InjectModel(GroupModel) private groupModel: typeof GroupModel,
    @InjectModel(AcademySettingModel) private academyModel: typeof AcademySettingModel,
    private escposService: EscposService,
    private printerService: PrinterService,
  ) {}

  async generateReceiptNumber(): Promise<string> {
    const today = new Date();
    const prefix = 'REC';
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const lastReceipt = await this.receiptModel.findOne({
      where: { receipt_number: { [Op.like]: `${prefix}-${dateStr}-%` } },
      order: [['id', 'DESC']],
    });

    let seq = 1;
    if (lastReceipt) {
      const parts = lastReceipt.receipt_number.split('-');
      seq = (parseInt(parts[parts.length - 1], 10) || 0) + 1;
    }

    return `${prefix}-${dateStr}-${String(seq).padStart(6, '0')}`;
  }

  async print(dto: PrintReceiptDto, center_id: number, admin_id?: number, client_ip?: string): Promise<ReceiptModel> {
    const payment = await this.paymentModel.findByPk(dto.payment_id, {
      include: [
        { model: StudentModel, attributes: ['id', 'first_name', 'last_name', 'phone_number', 'password'] },
        { model: GroupModel, attributes: ['id', 'name'] },
      ],
    });
    if (!payment) throw new NotFoundException('To\'lov topilmadi');

    const student = (payment as any).student as StudentModel;
    const group = (payment as any).group as GroupModel;
    if (!student) throw new NotFoundException('Student topilmadi');

    const academy = await this.academyModel.findOne({ where: { center_id } });
    const center = await EducationCenterModel.findByPk(center_id, { attributes: ['id', 'name', 'logo'] });
    const admins = await AdminModel.findAll({ where: { center_id } });
    const admin = admin_id ? admins.find(a => a.id === admin_id) : admins[0];
    const adminName = admin ? `${(admin as any).first_name || ''} ${(admin as any).last_name || ''}`.trim() || 'Admin' : 'Admin';

    // Get months for this payment
    const allPayments = await this.paymentModel.findAll({
      where: { student_id: payment.student_id, year: payment.year },
      order: [['month', 'ASC']],
    });
    const paidMonths = allPayments
      .filter(p => p.status === PaymentStatus.PAID || p.status === PaymentStatus.PARTIAL)
      .map(p => monthNames[(p.month - 1 + 12) % 12]);

    const discount = dto.discount || 0;
    const penalty = dto.penalty || 0;
    const amount = Number(payment.amount);
    const total = amount - discount + penalty;

    const receiptNumber = await this.generateReceiptNumber();
    const now = new Date();

    // Get printer
    let printer = null;
    if (dto.printer_id) {
      printer = await this.printerService.findOne(dto.printer_id, center_id);
    } else {
      printer = await this.printerService.getDefaultPrinter(center_id);
    }

    const settings: any = academy || {};
    const centerLogo = center?.logo ? `${process.env.API_URL || 'https://api.ilmify-edu.uz'}/uploads/centers/${center.logo}` : undefined;

    // Build receipt data
    const receiptData: ReceiptData = {
      academyName: settings.academy_name || center?.name || 'Academy',
      logo: centerLogo || settings.logo || undefined,
      address: settings.address || undefined,
      phones: [settings.phone1, settings.phone2, settings.phone3].filter(Boolean),
      website: settings.website || undefined,
      instagram: settings.instagram || undefined,
      telegramBot: settings.telegram_bot_link || undefined,
      telegramChannel: settings.telegram_channel || undefined,
      facebook: settings.facebook || undefined,
      youtube: settings.youtube || undefined,
      tiktok: settings.tiktok || undefined,
      googleMaps: settings.google_maps || undefined,
      receiptNumber,
      date: now.toLocaleDateString('uz-UZ'),
      time: now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      adminName,
      studentName: `${student.first_name} ${student.last_name}`.trim(),
      studentPhone: student.phone_number || '',
      studentPassword: (student as any).password || '',
      groupName: group?.name || '',
      paidMonths,
      paymentType: payment.payment_type || 'Naqt',
      amount,
      discount,
      penalty,
      total,
      note: payment.note || undefined,
      footerText: settings.footer_text || undefined,
      receiptNote: settings.receipt_note || undefined,
      thankYouText: settings.receipt_thank_you_text || 'Rahmat! Yana tashrif buyuring.',
      receiptHeader: settings.receipt_header || undefined,
      receiptFooter: settings.receipt_footer || undefined,
      qrVerifyUrl: `${settings.website || 'https://academy.uz'}/verify/${receiptNumber}`,
    };

    // Save receipt record
    const receipt = await this.receiptModel.create({
      receipt_number: receiptNumber,
      payment_id: payment.id,
      amount,
      discount,
      penalty,
      total,
      status: ReceiptStatus.PENDING,
      printer_id: printer?.id || null,
      printer_ip: printer?.ip_address || null,
      center_id,
      printed_by: admin_id || null,
      client_ip: client_ip || null,
    } as any);

    // Print
    if (printer && printer.enabled) {
      try {
        const config: PrinterConfig = this.printerService.toConfig(printer);
        await this.escposService.printViaLAN(receiptData, config);

        await receipt.update({
          status: ReceiptStatus.PRINTED,
          printed_at: new Date(),
          print_attempts: Sequelize.literal('print_attempts + 1'),
        } as any);
      } catch (err: any) {
        this.logger.error(`Print failed: ${err.message}`);
        await receipt.update({
          status: ReceiptStatus.FAILED,
          error_message: err.message,
          print_attempts: Sequelize.literal('print_attempts + 1'),
        } as any);
      }
    }

    return this.receiptModel.findByPk(receipt.id, {
      include: [{ model: PaymentModel }],
    }) as Promise<ReceiptModel>;
  }

  async reprint(dto: ReprintReceiptDto, center_id: number, admin_id?: number, client_ip?: string): Promise<ReceiptModel> {
    const original = await this.receiptModel.findOne({
      where: { id: dto.receipt_id, center_id },
    });
    if (!original) throw new NotFoundException('Chek topilmadi');

    // Get printer
    let printer = null;
    if (dto.printer_id) {
      printer = await this.printerService.findOne(dto.printer_id, center_id);
    } else if (original.printer_id) {
      printer = await this.printerService.findOne(original.printer_id, center_id).catch(() => null);
    } else {
      printer = await this.printerService.getDefaultPrinter(center_id);
    }

    // Re-print using original receipt data
    const newReceipt = await this.receiptModel.create({
      receipt_number: original.receipt_number,
      payment_id: original.payment_id,
      amount: original.amount,
      discount: original.discount,
      penalty: original.penalty,
      total: original.total,
      status: ReceiptStatus.PENDING,
      printer_id: printer?.id || original.printer_id,
      printer_ip: printer?.ip_address || original.printer_ip,
      center_id,
      printed_by: admin_id || null,
      client_ip: client_ip || null,
    } as any);

    // Try to print
    if (printer && printer.enabled) {
      const payment = await this.paymentModel.findByPk(original.payment_id, {
        include: [
          { model: StudentModel, attributes: ['id', 'first_name', 'last_name', 'phone_number'] },
          { model: GroupModel, attributes: ['id', 'name'] },
        ],
      });

      if (payment) {
        try {
          const student = (payment as any).student as StudentModel;
          const academy = await this.academyModel.findOne({ where: { center_id } });
          const settings: any = academy || {};

          const receiptData: ReceiptData = {
            academyName: settings.academy_name || 'Academy',
            phones: [settings.phone1, settings.phone2, settings.phone3].filter(Boolean),
            website: settings.website || undefined,
            instagram: settings.instagram || undefined,
            telegramBot: settings.telegram_bot_link || undefined,
            receiptNumber: original.receipt_number,
            date: new Date().toLocaleDateString('uz-UZ'),
            time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            adminName: 'Reprint',
            studentName: student ? `${student.first_name} ${student.last_name}`.trim() : 'N/A',
            studentPhone: student?.phone_number || '',
            groupName: (payment as any).group?.name || '',
            paidMonths: [],
            paymentType: payment.payment_type || 'Naqt',
            amount: Number(original.amount),
            discount: Number(original.discount),
            penalty: Number(original.penalty),
            total: Number(original.total),
            thankYouText: settings.receipt_thank_you_text || 'Rahmat!',
            qrVerifyUrl: `${settings.website || 'https://academy.uz'}/verify/${original.receipt_number}`,
          };

          const config: PrinterConfig = this.printerService.toConfig(printer);
          await this.escposService.printViaLAN(receiptData, config);

          await newReceipt.update({
            status: ReceiptStatus.REPRINTED,
            printed_at: new Date(),
            print_attempts: Sequelize.literal('print_attempts + 1'),
          } as any);
        } catch (err: any) {
          await newReceipt.update({
            status: ReceiptStatus.FAILED,
            error_message: err.message,
            print_attempts: Sequelize.literal('print_attempts + 1'),
          } as any);
        }
      }
    }

    // Update original as reprinted
    await original.update({ status: ReceiptStatus.REPRINTED } as any);

    return newReceipt;
  }

  async findAll(center_id: number, page = 1, limit = 20): Promise<{ rows: ReceiptModel[]; count: number; page: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    const { rows, count } = await this.receiptModel.findAndCountAll({
      where: { center_id },
      include: [{
        model: PaymentModel,
        include: [
          { model: StudentModel, attributes: ['id', 'first_name', 'last_name', 'phone_number'] },
          { model: GroupModel, attributes: ['id', 'name'] },
        ],
      }],
      order: [['created_at', 'DESC']],
      offset,
      limit,
    });
    return { rows, count, page, totalPages: Math.ceil(count / limit) };
  }

  async findOne(id: number, center_id: number): Promise<ReceiptModel> {
    const receipt = await this.receiptModel.findOne({
      where: { id, center_id },
      include: [{ model: PaymentModel }],
    });
    if (!receipt) throw new NotFoundException('Chek topilmadi');
    return receipt;
  }

  // ---- Templates ----
  async createTemplate(dto: any, center_id: number): Promise<ReceiptTemplateModel> {
    if (dto.is_default) {
      await this.templateModel.update({ is_default: false }, { where: { center_id } });
    }
    return this.templateModel.create({ ...dto, center_id } as any);
  }

  async findAllTemplates(center_id: number): Promise<ReceiptTemplateModel[]> {
    return this.templateModel.findAll({
      where: { center_id },
      order: [['is_default', 'DESC'], ['created_at', 'DESC']],
    });
  }

  async updateTemplate(id: number, dto: any, center_id: number): Promise<ReceiptTemplateModel> {
    const template = await this.templateModel.findOne({ where: { id, center_id } });
    if (!template) throw new NotFoundException('Shablon topilmadi');
    if (dto.is_default) {
      await this.templateModel.update({ is_default: false }, { where: { center_id, id: { [Op.ne]: id } } });
    }
    await template.update(dto);
    return template.reload();
  }

  async deleteTemplate(id: number, center_id: number): Promise<void> {
    const template = await this.templateModel.findOne({ where: { id, center_id } });
    if (!template) throw new NotFoundException('Shablon topilmadi');
    await template.destroy();
  }
}
