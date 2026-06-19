import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi to\'lov yaratish' })
  create(@Body() dto: CreatePaymentDto, @Req() req?: any) {
    const user = req?.user;
    return this.service.create({ ...dto, center_id: req?.center_id } as any, user);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha to\'lovlar' })
  @ApiQuery({ name: 'group_id', required: false })
  @ApiQuery({ name: 'student_id', required: false })
  @ApiQuery({ name: 'month', required: false })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'payment_type', required: false, description: 'To\'lov turi: click, naqt, karta yoki boshqa matn' })
  @ApiQuery({ name: 'date_from', required: false, description: 'Sanadan boshlab (YYYY-MM-DD)' })
  @ApiQuery({ name: 'date_to', required: false, description: 'Sanagacha (YYYY-MM-DD)' })
  findAll(
    @Query('group_id') group_id?: string,
    @Query('student_id') student_id?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('status') status?: string,
    @Query('payment_type') payment_type?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
    @Req() req?: any,
  ) {
    return this.service.findAll(
      group_id ? Number(group_id) : undefined,
      student_id ? Number(student_id) : undefined,
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
      status,
      payment_type,
      date_from,
      date_to,
      req?.center_id,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: "To'lov statistikasi" })
  getStats(@Req() req?: any) {
    return this.service.getStats(req?.center_id);
  }

  @Get('auto-generate')
  @ApiOperation({ summary: 'Oylik to\'lovlarni avtomatik yaratish' })
  autoGenerate() {
    return this.service.autoGenerateMonthlyPayments();
  }

  @Get('send-reminders')
  @ApiOperation({ summary: "To'lov eslatmalarini yuborish" })
  sendReminders() {
    return this.service.sendPaymentReminders();
  }

  @Get('total-debt')
  @ApiOperation({ summary: 'Jami qarzdorlik' })
  @ApiQuery({ name: 'month', required: false })
  @ApiQuery({ name: 'year', required: false })
  getTotalDebt(@Query('month') month?: string, @Query('year') year?: string, @Req() req?: any) {
    return this.service.getTotalDebt(month ? Number(month) : undefined, year ? Number(year) : undefined, req?.center_id);
  }

  @Get('total-income')
  @ApiOperation({ summary: 'Barcha davrdagi jami tushum' })
  getAllTimeTotal(@Req() req?: any) {
    return this.service.getAllTimeTotal(req?.center_id);
  }

  @Get('students-overview')
  @ApiOperation({ summary: 'Barcha studentlar to\'lov holati' })
  @ApiQuery({ name: 'month', required: true })
  @ApiQuery({ name: 'year', required: true })
  getStudentsOverview(@Query('month') month: string, @Query('year') year: string, @Req() req?: any) {
    return this.service.getStudentsOverview(Number(month), Number(year), req?.center_id);
  }

  @Get('year-overview')
  @ApiOperation({ summary: 'Yil davomida to\'lov holati' })
  @ApiQuery({ name: 'year', required: true })
  getYearOverview(@Query('year') year: string, @Req() req?: any) {
    return this.service.getYearOverview(Number(year), req?.center_id);
  }

  @Get('monthly-income')
  @ApiOperation({ summary: 'Oylik tushum (oyma-oy summa)' })
  @ApiQuery({ name: 'year', required: true })
  getMonthlyIncome(@Query('year') year: string, @Req() req?: any) {
    return this.service.getMonthlyIncome(Number(year), req?.center_id);
  }

  @Get('students/:id')
  @ApiOperation({ summary: "Student to'lovlari" })
  findByStudent(@Param('id') id: string) {
    return this.service.findByStudent(Number(id));
  }

  @Get('groups/:id')
  @ApiOperation({ summary: "Guruh to'lovlari" })
  @ApiQuery({ name: 'month', required: false })
  @ApiQuery({ name: 'year', required: false })
  findByGroup(
    @Param('id') id: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.service.findByGroup(Number(id), month ? Number(month) : undefined, year ? Number(year) : undefined);
  }

  @Patch(':id')
  @ApiOperation({ summary: "To'lovni yangilash" })
  update(@Param('id') id: string, @Body() dto: UpdatePaymentDto, @Req() req?: any) {
    const user = req?.user;
    return this.service.update(Number(id), dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Bitta to'lovni ID bo'yicha o'chirish" })
  @ApiParam({ name: 'id', required: true, description: "To'lov ID si - raqam kiriting (masalan: 22)", example: 22 })
  remove(@Param('id') id: string, @Req() req?: any) {
    const user = req?.user;
    return this.service.remove(Number(id), user);
  }

  @Delete('all/by-center/:center_id')
  @ApiOperation({ summary: "Center ID bo'yicha barcha to'lovlarni o'chirish" })
  @ApiParam({ name: 'center_id', required: true, description: "Education Center ID", example: 1 })
  removeAllByCenter(@Param('center_id') center_id: string) {
    return this.service.removeAllByCenter(Number(center_id));
  }

  @Post('check-reminders')
  @ApiOperation({ summary: "3 ta darsdan keyin to'lov eslatmasini yuborish" })
  checkReminders(@Body() dto: { group_id: number }) {
    return this.service.checkLessonReminders(dto.group_id);
  }

  @Post('absence-notification')
  @ApiOperation({ summary: 'Darsga kelmaganlik haqida bildirishnoma' })
  sendAbsenceNotification(@Body() dto: { student_id: number; lesson_date: string }) {
    return this.service.sendAbsenceNotification(dto.student_id, dto.lesson_date);
  }

  @Get('debts/:studentId')
  @ApiOperation({ summary: "O'quvchining barcha qarzdorliklari" })
  getStudentDebts(@Param('studentId') studentId: string, @Req() req?: any) {
    return this.service.getStudentDebts(Number(studentId), req?.center_id);
  }

  @Get('export')
  @ApiOperation({ summary: "To'lovlarni Excel format-da yuklab olish" })
  @ApiQuery({ name: 'month', required: true })
  @ApiQuery({ name: 'year', required: true })
  async export(
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
    @Req() req?: any,
  ) {
    try {
      const result = await this.service.exportToExcel(Number(month), Number(year), req?.center_id);
      const { exportData, summary } = result;
      const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

      const XLSX = require('xlsx');

      // --- Build raw data array with title and summary ---
      const rows: any[][] = [];

      // Row 1: Title
      rows.push([`To'lov hisoboti | ${monthNames[Number(month) - 1]} ${year}`]);

      // Row 2: Empty
      rows.push([]);

      // Row 3: Headers
      const headers = ['No', 'Student Ismi', 'Telefon', 'Guruh', 'Oy', 'Yil', 'Oylik narx', 'Unumli narx', "To'langan", 'Qarz', 'Status', "To'lov turi", "Kechikkan darslar", 'Izoh'];
      rows.push(headers);

      // Data rows
      for (const item of exportData) {
        rows.push([
          item['No'],
          item['Student Ismi'],
          item['Telefon'],
          item['Guruh'],
          item['Oy'],
          item['Yil'],
          Number(item['Oylik narx']),
          Number(item['Unumli narx']),
          Number(item["To'langan"]),
          Number(item['Qarz']),
          item['Status'],
          item["To'lov turi"] || '-',
          Number(item['Kechikkan darslar']),
          item['Izoh'],
        ]);
      }

      // Empty row before summary
      rows.push([]);

      // Summary section
      rows.push(['', 'UMUMIY HISOBOT', '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['Jami studentlar', summary.totalStudents, '', '', "To'langan", summary.totalPaid, "To'lanmagan", summary.totalUnpaid, 'Qisman', summary.totalPartial, '', '', '']);
      rows.push([`Oy: ${monthNames[Number(month) - 1]} ${year}`, '', '', '', '', '', '', '', '', '', '', '', '']);
      rows.push(['Oylik narx (jami)', summary.sumOylik, '', "Unumli narx (jami)", summary.sumEffective, '', "To'langan (jami)", summary.sumPaid, '', 'Qarz (jami)', summary.sumDebt, '', '']);

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Merge title row
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },  // Title
        { s: { r: rows.length - 4, c: 0 }, e: { r: rows.length - 4, c: 13 } },  // Summary header
      ];

      // Column widths
      ws['!cols'] = [
        { wch: 5 },   // No
        { wch: 22 },  // Student Ismi
        { wch: 17 },  // Telefon
        { wch: 18 },  // Guruh
        { wch: 12 },  // Oy
        { wch: 6 },   // Yil
        { wch: 14 },  // Oylik narx
        { wch: 14 },  // Unumli narx
        { wch: 14 },  // To'langan
        { wch: 14 },  // Qarz
        { wch: 14 },  // Status
        { wch: 14 },  // To'lov turi
        { wch: 14 },  // Kechikkan darslar
        { wch: 22 },  // Izoh
      ];

      // Style rows: bold for title, headers, and summary
      const boldStyle = { font: { bold: true, sz: 12 } };
      const titleStyle = { font: { bold: true, sz: 14, color: { rgb: '1F4E79' } } };
      const headerStyle = { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4472C4' } } };
      const summaryStyle = { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '2E75B6' } } };

      // Title row
      if (ws['A1']) ws['A1'].s = titleStyle;

      // Header row
      const headerRowNum = 2;
      for (let c = 0; c < headers.length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: headerRowNum, c });
        if (ws[cellRef]) ws[cellRef].s = headerStyle;
      }

      // Summary header row
      const summaryRow = rows.length - 4;
      for (let c = 0; c < 14; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: summaryRow, c });
        if (ws[cellRef]) ws[cellRef].s = summaryStyle;
      }

      // Bold for summary data labels
      for (let r = rows.length - 3; r < rows.length; r++) {
        for (let c = 0; c < 14; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (ws[cellRef] && ws[cellRef].v) {
            ws[cellRef].s = { ...ws[cellRef].s, font: { bold: true, sz: 11 } };
          }
        }
      }

      // Alignment
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < 14; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (ws[cellRef]) {
            ws[cellRef].s = {
              ...(ws[cellRef].s || {}),
              alignment: { vertical: 'center', horizontal: c === 0 || c >= 6 ? 'center' : 'left' },
            };
          }
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, ws, `${monthNames[Number(month) - 1]} ${year}`);

      // --- Year summary sheet (all months) ---
      const yearData = await this.service.getYearOverview(Number(year), req?.center_id);
      if (yearData && yearData.length > 0) {
        const yearRows: any[][] = [];
        yearRows.push([`${year} yil to'lov xulosasi`]);
        yearRows.push([]);
        yearRows.push(['Oy', 'Jami studentlar', "To'langan", "To'lanmagan", 'Qisman', "To'lov foizi"]);

        for (const m of yearData) {
          const pct = m.total > 0 ? Math.round((m.paid / m.total) * 100) : 0;
          yearRows.push([monthNames[m.month - 1], m.total, m.paid, m.unpaid, m.partial, `${pct}%`]);
        }

        const totalStudentsY = yearData.reduce((s: number, m: any) => s + m.total, 0);
        const totalPaidY = yearData.reduce((s: number, m: any) => s + m.paid, 0);
        const totalUnpaidY = yearData.reduce((s: number, m: any) => s + m.unpaid, 0);
        const totalPartialY = yearData.reduce((s: number, m: any) => s + m.partial, 0);
        yearRows.push([]);
        yearRows.push(['JAMI', totalStudentsY, totalPaidY, totalUnpaidY, totalPartialY, totalStudentsY > 0 ? `${Math.round((totalPaidY / totalStudentsY) * 100)}%` : '0%']);

        const yearWs = XLSX.utils.aoa_to_sheet(yearRows);
        yearWs['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }];
        yearWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

        if (yearWs['A1']) yearWs['A1'].s = titleStyle;
        const yearHeaderRow = 2;
        for (let c = 0; c < 6; c++) {
          const cr = XLSX.utils.encode_cell({ r: yearHeaderRow, c });
          if (yearWs[cr]) yearWs[cr].s = headerStyle;
        }
        const yearTotalRow = yearRows.length - 1;
        for (let c = 0; c < 6; c++) {
          const cr = XLSX.utils.encode_cell({ r: yearTotalRow, c });
          if (yearWs[cr]) yearWs[cr].s = summaryStyle;
        }

        XLSX.utils.book_append_sheet(workbook, yearWs, `${year} yil xulosasi`);
      }

      const monthName = monthNames[Number(month) - 1];
      const fileName = `Tolovlar_${monthName}_${year}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: 'Excel yaratishda xatolik', error: (error as any).message });
    }
  }
}
