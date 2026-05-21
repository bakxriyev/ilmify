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
  async incomingMessage(
    @Param('centerId') centerId: string,
    @Body() body: { chat_id: number; text: string; first_name?: string; last_name?: string; username?: string },
  ) {
    return this.service.handleIncomingMessage(Number(centerId), body);
  }

  @Get(':centerId/config')
  async getConfig(@Param('centerId') centerId: string) {
    return this.service.getBotConfig(Number(centerId));
  }

  @Put(':centerId/config')
  async updateConfig(@Param('centerId') centerId: string, @Body() body: { bot_token?: string; is_active?: boolean }) {
    return this.service.updateBotConfig(Number(centerId), body);
  }

  @Get(':centerId/chats')
  async getChats(@Param('centerId') centerId: string, @Query('search') search?: string) {
    return this.service.getChats(Number(centerId), search);
  }

  @Get(':centerId/inbox')
  async getInbox(@Param('centerId') centerId: string, @Query('search') search?: string) {
    return this.service.getInbox(Number(centerId), search);
  }

  @Post(':centerId/reply')
  async sendReply(@Param('centerId') centerId: string, @Body() body: { chat_id: number; text: string }) {
    return this.service.sendReply(Number(centerId), body.chat_id, body.text);
  }

  @Get(':centerId/templates')
  async getTemplates(@Param('centerId') centerId: string) {
    return this.service.getTemplates(Number(centerId));
  }

  @Post(':centerId/templates')
  async createTemplate(@Param('centerId') centerId: string, @Body() body: { name: string; content: string }) {
    return this.service.createTemplate(Number(centerId), body);
  }

  @Put('templates/:id')
  async updateTemplate(@Param('id') id: string, @Body() body: { name?: string; content?: string }) {
    return this.service.updateTemplate(Number(id), body);
  }

  @Delete('templates/:id')
  async deleteTemplate(@Param('id') id: string) {
    return this.service.deleteTemplate(Number(id));
  }

  @Get(':centerId/broadcasts')
  async getBroadcasts(@Param('centerId') centerId: string) {
    return this.service.getBroadcasts(Number(centerId));
  }

  @Post(':centerId/send')
  async sendMessage(@Param('centerId') centerId: string, @Body() body: {
    target_type: string;
    target_id?: number;
    text: string;
    template_id?: number;
  }) {
    if (!body.text) body.text = '';
    return this.service.sendMessage(Number(centerId), body);
  }
}
