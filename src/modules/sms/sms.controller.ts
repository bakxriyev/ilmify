import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SmsService } from './sms.service';
import {
  SendSmsDto, SendBulkSmsDto, SendOtpDto, VerifyOtpDto,
  SmsReportQueryDto, CreateSmsTemplateDto, UpdateSmsTemplateDto,
  TestEskizConnectionDto, SendToStudentDto, SendToAllStudentsDto,
  SendToTeacherDto, SendToAllTeachersDto, SendToGroupStudentsDto,
  SendToSelectedStudentsDto, SendCredentialsDto,
} from './dto/send-sms.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@ApiTags('SMS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Bitta SMS yuborish' })
  sendSms(@Body() dto: SendSmsDto) {
    return this.smsService.sendSms(dto.phone, dto.message, dto.from, dto.center_id, dto.created_by);
  }

  @Post('send-bulk')
  @ApiOperation({ summary: "Ko'p SMS yuborish (bulk)" })
  sendBulkSms(@Body() dto: SendBulkSmsDto, @Req() req: any) {
    return this.smsService.sendBulkSms(dto.messages, dto.center_id, dto.created_by || req.user?.id);
  }

  @Get('center-info')
  @ApiOperation({ summary: 'Markaz haqida ma\'lumot (nomi)' })
  getCenterInfo(@Req() req: any) {
    if (!req.user?.center_id) throw new HttpException('Markaz aniqlanmadi', 400);
    return this.smsService.getCenterInfo(req.user.center_id);
  }

  @Get('students')
  @ApiOperation({ summary: 'Studentlarni qidirish (SMS yuborish uchun tanlash)' })
  searchStudents(@Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string, @Req() req?: any) {
    return this.smsService.searchStudents(search, Number(page) || 1, Number(limit) || 20, req?.user?.center_id);
  }

  @Get('teachers')
  @ApiOperation({ summary: "O'qituvchilarni qidirish (SMS yuborish uchun tanlash)" })
  searchTeachers(@Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string, @Req() req?: any) {
    return this.smsService.searchTeachers(search, Number(page) || 1, Number(limit) || 20, req?.user?.center_id);
  }

  @Get('groups')
  @ApiOperation({ summary: 'Guruhlar ro\'yxati (SMS yuborish uchun tanlash)' })
  listGroups(@Query('search') search?: string, @Req() req?: any) {
    return this.smsService.listGroups(search, req?.user?.center_id);
  }

  @Post('send-to-student')
  @ApiOperation({ summary: 'Bitta studentga SMS yuborish (shablon bilan)' })
  sendToStudent(@Body() dto: SendToStudentDto, @Req() req: any) {
    return this.smsService.sendToStudent(
      dto.student_id, dto.template_or_message, dto.variables,
      dto.center_id || req.user?.center_id,
      dto.created_by || req.user?.id,
    );
  }

  @Post('send-to-all-students')
  @ApiOperation({ summary: 'Barcha studentlarga SMS yuborish (shablon bilan)' })
  sendToAllStudents(@Body() dto: SendToAllStudentsDto, @Req() req: any) {
    return this.smsService.sendToAllStudents(
      dto.template_or_message, dto.variables,
      dto.center_id || req.user?.center_id,
      dto.created_by || req.user?.id,
    );
  }

  @Post('send-to-teacher')
  @ApiOperation({ summary: "Bitta o'qituvchiga SMS yuborish" })
  sendToTeacher(@Body() dto: SendToTeacherDto, @Req() req: any) {
    return this.smsService.sendToTeacher(
      dto.teacher_id, dto.message,
      dto.center_id || req.user?.center_id,
      dto.created_by || req.user?.id,
    );
  }

  @Post('send-to-all-teachers')
  @ApiOperation({ summary: "Barcha o'qituvchilarga SMS yuborish" })
  sendToAllTeachers(@Body() dto: SendToAllTeachersDto, @Req() req: any) {
    return this.smsService.sendToAllTeachers(
      dto.message,
      dto.center_id || req.user?.center_id,
      dto.created_by || req.user?.id,
    );
  }

  @Post('send-to-group')
  @ApiOperation({ summary: 'Guruh studentlariga SMS yuborish (shablon bilan)' })
  sendToGroup(@Body() dto: SendToGroupStudentsDto, @Req() req: any) {
    return this.smsService.sendToGroupStudents(
      dto.group_id, dto.template_or_message, dto.variables,
      dto.center_id || req.user?.center_id,
      dto.created_by || req.user?.id,
    );
  }

  @Post('send-to-selected')
  @ApiOperation({ summary: 'Tanlangan studentlarga SMS yuborish (shablon bilan)' })
  sendToSelected(@Body() dto: SendToSelectedStudentsDto, @Req() req: any) {
    return this.smsService.sendToSelectedStudents(
      dto.student_ids, dto.template_or_message, dto.variables,
      dto.center_id || req.user?.center_id,
      dto.created_by || req.user?.id,
    );
  }

  @Post('send-credentials')
  @ApiOperation({ summary: 'Studentga kirish ma\'lumotlarini SMS orqali yuborish' })
  sendCredentials(@Body() dto: SendCredentialsDto, @Req() req: any) {
    return this.smsService.sendCredentials(
      dto.student_id, dto.bot_link,
      dto.center_id || req.user?.center_id,
      dto.created_by || req.user?.id,
    );
  }

  @Get('status/:eskizMessageId')
  @ApiOperation({ summary: 'SMS holatini tekshirish' })
  getStatus(@Param('eskizMessageId') eskizMessageId: string) {
    return this.smsService.getSmsStatus(eskizMessageId);
  }

  @Get('report')
  @ApiOperation({ summary: 'Eskiz hisoboti' })
  getReport(@Query() query: SmsReportQueryDto) {
    return this.smsService.getReport(query.start_date, query.end_date);
  }

  @Get('logs')
  @ApiOperation({ summary: 'SMS loglari tarixi (filtr, pagination)' })
  getLogs(@Query() query: SmsReportQueryDto, @Req() req: any) {
    return this.smsService.getLogs({
      start_date: query.start_date,
      end_date: query.end_date,
      status: query.status,
      center_id: req.user?.center_id,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'SMS statistikasi' })
  getStats(@Req() req: any) {
    return this.smsService.getStats(req.user?.center_id);
  }

  @Post('send-otp')
  @ApiOperation({ summary: 'OTP kod yuborish' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.smsService.sendOtp(dto.phone, dto.center_id);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'OTP kodni tekshirish' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.smsService.verifyOtp(dto.phone, dto.code);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Default (Eskizda tasdiqlangan) shablonlar ro\'yxati' })
  getTemplates() {
    return this.smsService.getDefaultTemplates();
  }

  @Post('templates/register-eskiz')
  @ApiOperation({ summary: 'Default shablonlarni Eskizga ro\'yxatdan o\'tkazish (moderatsiya uchun)' })
  async registerTemplatesWithEskiz() {
    return this.smsService.registerDefaultTemplatesWithEskiz();
  }

  @Get('templates/custom')
  @ApiOperation({ summary: 'Maxsus shablonlar ro\'yxati' })
  getCustomTemplates(@Req() req: any) {
    return this.smsService.getTemplates(req.user?.center_id);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Yangi shablon yaratish' })
  createTemplate(@Body() dto: CreateSmsTemplateDto, @Req() req: any) {
    return this.smsService.createTemplate({ ...dto, center_id: req.user?.center_id });
  }

  @Post('templates/:id')
  @ApiOperation({ summary: 'Shablonni yangilash' })
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateSmsTemplateDto) {
    return this.smsService.updateTemplate(Number(id), dto);
  }

  @Post('templates/:id/delete')
  @ApiOperation({ summary: 'Shablonni o\'chirish' })
  deleteTemplate(@Param('id') id: string) {
    return this.smsService.deleteTemplate(Number(id));
  }

  @Post('test-connection')
  @ApiOperation({ summary: 'Eskiz ulanishini tekshirish' })
  testConnection(@Body() dto: TestEskizConnectionDto) {
    return this.smsService.testConnection(dto.email, dto.password);
  }
}
