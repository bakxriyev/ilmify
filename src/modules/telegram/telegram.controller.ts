import { Controller, Get, Put, Post, Body, Param, Query, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('telegram-settings')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get()
  async getSettings() {
    return this.telegramService.getSettings();
  }

  @Put()
  async updateSettings(@Body() body: { bot_token?: string; channel_usernames?: string; is_active?: boolean }) {
    return this.telegramService.updateSettings(body);
  }

  @Get('bot-config')
  async getBotConfig() {
    return this.telegramService.getBotConfig();
  }
}

@Controller('telegram')
export class TelegramAuthController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('auth')
  async auth(@Body() body: { phone_number: string }) {
    if (!body.phone_number) throw new UnauthorizedException('Telefon raqam kiritilmagan');
    return this.telegramService.authByPhone(body.phone_number);
  }

  @Post('verify-password')
  async verifyPassword(@Body() body: { phone_number: string; password: string }) {
    if (!body.phone_number || !body.password) throw new UnauthorizedException('Telefon raqam va parol kiritilmagan');
    return this.telegramService.verifyPassword(body.phone_number, body.password);
  }

  @Get('student/:id/profile')
  async getStudentProfile(@Param('id') id: string) {
    return this.telegramService.getStudentProfile(Number(id));
  }

  @Get('student/:id/group')
  async getStudentGroup(@Param('id') id: string) {
    return this.telegramService.getStudentGroup(Number(id));
  }

  @Get('student/:id/payments')
  async getStudentPayments(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.telegramService.getStudentPayments(Number(id), limit ? Number(limit) : 20);
  }

  @Get('student/:id/attendance')
  async getStudentAttendance(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.telegramService.getStudentAttendance(Number(id), limit ? Number(limit) : 20);
  }

  @Get('student/:id/parents')
  async getStudentParents(@Param('id') id: string) {
    return this.telegramService.getStudentParents(Number(id));
  }
}
