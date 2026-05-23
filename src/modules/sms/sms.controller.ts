import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SmsService } from './sms.service';
import {
  SendSmsDto, SendBulkSmsDto, SendOtpDto, VerifyOtpDto,
  SmsReportQueryDto, CreateSmsTemplateDto, UpdateSmsTemplateDto,
  TestEskizConnectionDto,
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
  @ApiOperation({ summary: 'SMS loglari tarixi' })
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
  @ApiOperation({ summary: 'Default shablonlar ro\'yxati' })
  getTemplates() {
    return this.smsService.getDefaultTemplates();
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
