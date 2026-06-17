import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';

@ApiTags('AI')
@Controller('ai')
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'AI bilan chat (savol berish)' })
  async chat(
    @Body('message') message: string,
    @Headers('authorization') auth: string,
  ) {
    const token = auth?.replace('Bearer ', '');
    return this.aiService.chat(message, token);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'AI dashboard statistikasi' })
  async getDashboard(@Req() req: any) {
    const auth = req.headers?.authorization as string;
    const token = auth?.replace('Bearer ', '');
    return this.aiService.getDashboard(token);
  }

  @Get('dashboard/revenue-trend')
  @ApiOperation({ summary: 'Daromad trendi' })
  async getRevenueTrend(@Req() req: any) {
    const auth = req.headers?.authorization as string;
    const token = auth?.replace('Bearer ', '');
    return this.aiService.getRevenueTrend(token);
  }

  @Get('dashboard/student-growth')
  @ApiOperation({ summary: "O'quvchilar o'sishi" })
  async getStudentGrowth(@Req() req: any) {
    const auth = req.headers?.authorization as string;
    const token = auth?.replace('Bearer ', '');
    return this.aiService.getStudentGrowth(token);
  }

  @Get('dashboard/attendance-trend')
  @ApiOperation({ summary: 'Davomat trendi' })
  async getAttendanceTrend(@Req() req: any) {
    const auth = req.headers?.authorization as string;
    const token = auth?.replace('Bearer ', '');
    return this.aiService.getAttendanceTrend(token);
  }

  @Get('dashboard/lead-conversion')
  @ApiOperation({ summary: 'Lead konversiyasi' })
  async getLeadConversion(@Req() req: any) {
    const auth = req.headers?.authorization as string;
    const token = auth?.replace('Bearer ', '');
    return this.aiService.getLeadConversion(token);
  }

  @Get('dashboard/monthly-comparison')
  @ApiOperation({ summary: 'Oylik taqqoslash' })
  async getMonthlyComparison(@Req() req: any) {
    const auth = req.headers?.authorization as string;
    const token = auth?.replace('Bearer ', '');
    return this.aiService.getMonthlyComparison(token);
  }

  @Get('health')
  @ApiOperation({ summary: 'AI xizmati holati' })
  async healthCheck() {
    return this.aiService.healthCheck();
  }
}
