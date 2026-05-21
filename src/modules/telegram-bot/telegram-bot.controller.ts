import { Controller, Get, Put, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { BotManagerService } from './bot-manager.service';

@Controller('telegram-bot')
export class TelegramBotController {
  constructor(
    private readonly service: TelegramBotService,
    private readonly botManager: BotManagerService,
  ) {}

  @Get('active-configs')
  async getActiveConfigs() {
    return this.service.getActiveConfigs();
  }

  @Post(':centerId/incoming')
  async incomingMessage(@Param('centerId') centerId: string, @Body() body: any) {
    return this.service.handleIncomingMessage(Number(centerId), body);
  }

  @Post(':centerId/contact-admin')
  async contactAdmin(@Param('centerId') centerId: string, @Body() body: any) {
    return this.service.contactAdmin(Number(centerId), body.chat_id, body.text);
  }

  // ─── Auth ────────────────────────────────────────────────
  @Get(':centerId/chat-status/:chatId')
  async getChatStatus(@Param('centerId') centerId: string, @Param('chatId') chatId: string) {
    return this.service.getChatStatus(Number(centerId), Number(chatId));
  }

  @Post(':centerId/check-phone')
  async checkPhone(@Param('centerId') centerId: string, @Body() body: any) {
    return this.service.checkPhone(Number(centerId), body.phone);
  }

  @Post(':centerId/verify-password')
  async verifyPassword(@Param('centerId') centerId: string, @Body() body: any) {
    return this.service.verifyPassword(Number(centerId), body.phone, body.password);
  }

  @Post(':centerId/link-student')
  async linkStudent(@Param('centerId') centerId: string, @Body() body: any) {
    return this.service.linkStudent(Number(centerId), body);
  }

  // ─── Bot Student Info ────────────────────────────────────
  @Get(':centerId/student-profile/:studentId')
  async getStudentProfile(@Param('centerId') centerId: string, @Param('studentId') studentId: string) {
    return this.service.getStudentProfile(Number(centerId), Number(studentId));
  }

  @Get(':centerId/student-attendance/:studentId')
  async getStudentAttendance(@Param('centerId') centerId: string, @Param('studentId') studentId: string) {
    return this.service.getStudentAttendance(Number(centerId), Number(studentId));
  }

  @Get(':centerId/student-payments/:studentId')
  async getStudentPayments(@Param('centerId') centerId: string, @Param('studentId') studentId: string) {
    return this.service.getStudentPayments(Number(centerId), Number(studentId));
  }

  @Get(':centerId/student-groups/:studentId')
  async getStudentGroups(@Param('centerId') centerId: string, @Param('studentId') studentId: string) {
    return this.service.getStudentGroups(Number(centerId), Number(studentId));
  }

  @Get(':centerId/student-grades/:studentId')
  async getStudentGrades(@Param('centerId') centerId: string, @Param('studentId') studentId: string) {
    return this.service.getStudentGrades(Number(centerId), Number(studentId));
  }

  @Get(':centerId/group-schedule/:groupId')
  async getGroupSchedule(@Param('centerId') centerId: string, @Param('groupId') groupId: string) {
    return this.service.getGroupSchedule(Number(centerId), Number(groupId));
  }

  // ─── Config ──────────────────────────────────────────────
  @Get(':centerId/config')
  async getConfig(@Param('centerId') centerId: string) {
    return this.service.getBotConfig(Number(centerId));
  }

  @Put(':centerId/config')
  async updateConfig(@Param('centerId') centerId: string, @Body() body: any) {
    return this.service.updateBotConfig(Number(centerId), body);
  }

  // ─── Chats ───────────────────────────────────────────────
  @Get(':centerId/chats')
  async getChats(@Param('centerId') centerId: string, @Query('search') search?: string) {
    return this.service.getChats(Number(centerId), search);
  }

  @Delete(':centerId/chats/:chatId')
  async deleteChat(@Param('centerId') centerId: string, @Param('chatId') chatId: string) {
    return this.service.deleteChat(Number(centerId), Number(chatId));
  }

  @Delete(':centerId/chats')
  async deleteAllChats(@Param('centerId') centerId: string) {
    return this.service.deleteAllChats(Number(centerId));
  }

  // ─── Inbox ───────────────────────────────────────────────
  @Get(':centerId/inbox')
  async getInbox(@Param('centerId') centerId: string, @Query('search') search?: string) {
    return this.service.getInbox(Number(centerId), search);
  }

  @Post(':centerId/reply')
  async sendReply(@Param('centerId') centerId: string, @Body() body: any) {
    return this.service.sendReply(Number(centerId), body.chat_id, body.text);
  }

  // ─── Templates ───────────────────────────────────────────
  @Get(':centerId/templates')
  async getTemplates(@Param('centerId') centerId: string) {
    return this.service.getTemplates(Number(centerId));
  }

  @Post(':centerId/templates')
  async createTemplate(@Param('centerId') centerId: string, @Body() body: any) {
    return this.service.createTemplate(Number(centerId), body);
  }

  @Put('templates/:id')
  async updateTemplate(@Param('id') id: string, @Body() body: any) {
    return this.service.updateTemplate(Number(id), body);
  }

  @Delete('templates/:id')
  async deleteTemplate(@Param('id') id: string) {
    return this.service.deleteTemplate(Number(id));
  }

  // ─── Broadcasts ──────────────────────────────────────────
  @Get(':centerId/broadcasts')
  async getBroadcasts(@Param('centerId') centerId: string) {
    return this.service.getBroadcasts(Number(centerId));
  }

  @Post(':centerId/send')
  async sendMessage(@Param('centerId') centerId: string, @Body() body: any) {
    return this.service.sendMessage(Number(centerId), body);
  }
}
