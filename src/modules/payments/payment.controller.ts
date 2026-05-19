import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
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
    return this.service.create({ ...dto, center_id: req?.center_id } as any);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha to\'lovlar' })
  @ApiQuery({ name: 'group_id', required: false })
  @ApiQuery({ name: 'student_id', required: false })
  @ApiQuery({ name: 'month', required: false })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('group_id') group_id?: string,
    @Query('student_id') student_id?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('status') status?: string,
    @Req() req?: any,
  ) {
    return this.service.findAll(
      group_id ? Number(group_id) : undefined,
      student_id ? Number(student_id) : undefined,
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
      status,
      req?.center_id,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: "To'lov statistikasi" })
  getStats() {
    return this.service.getStats();
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
  update(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: "To'lovni o'chirish" })
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
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
}
