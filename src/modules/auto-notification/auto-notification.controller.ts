import { Controller, Get, Put, Param, Body, Query } from '@nestjs/common';
import { AutoNotificationService } from './auto-notification.service';

@Controller('auto-notification')
export class AutoNotificationController {
  constructor(private readonly service: AutoNotificationService) {}

  @Get(':centerId/config')
  async getConfig(@Param('centerId') centerId: string) {
    return this.service.getConfig(Number(centerId));
  }

  @Put(':centerId/config')
  async updateConfig(@Param('centerId') centerId: string, @Body() body: any) {
    return this.service.updateConfig(Number(centerId), body);
  }

  @Get(':centerId/logs')
  async getLogs(
    @Param('centerId') centerId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.service.getLogs(Number(centerId), Number(page) || 1, Number(limit) || 50);
  }

  @Get(':centerId/stats')
  async getStats(@Param('centerId') centerId: string) {
    return this.service.getStats(Number(centerId));
  }
}
