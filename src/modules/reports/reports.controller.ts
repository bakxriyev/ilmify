import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('daily')
  @ApiOperation({ summary: 'Kunlik kirim/chiqim hisobot' })
  @ApiQuery({ name: 'date', required: true, example: '2026-07-01' })
  getDaily(@Query('date') date: string, @Req() req?: any) {
    return this.service.getDaily(date, req?.center_id);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Oylik kirim/chiqim hisobot' })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'month', required: true })
  getMonthly(@Query('year') year: string, @Query('month') month: string, @Req() req?: any) {
    return this.service.getMonthly(Number(year), Number(month), req?.center_id);
  }

  @Get('cash-balance')
  @ApiOperation({ summary: 'Kassadagi pul qoldig\'i' })
  getCashBalance(@Req() req?: any) {
    return this.service.getCashBalance(req?.center_id);
  }

  @Get('overview')
  @ApiOperation({ summary: 'Umumiy statistika (studentlar, tushum, chiqim)' })
  getOverview(@Req() req?: any) {
    return this.service.getOverview(req?.center_id);
  }

  @Get('daily-list')
  @ApiOperation({ summary: 'Kunlik kirim/chiqim ro\'yxati' })
  getDailyList(@Req() req?: any) {
    return this.service.getDailyList(req?.center_id);
  }
}
