import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req,
  Res, Header, StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';
import { PrinterAgentService } from './printer-agent.service';
import { PrinterAgentGateway } from './printer-agent.gateway';
import {
  RegisterAgentDto, HeartbeatDto, CreateJobDto, UpdateAgentDto,
} from './dto/printer-agent.dto';

@ApiTags('Printer Agent')
@Controller('printer-agent')
export class PrinterAgentController {
  constructor(
    private readonly agentService: PrinterAgentService,
    private readonly gateway: PrinterAgentGateway,
  ) {}

  @Post('agents/register')
  @ApiOperation({ summary: 'Agentni ro\'yxatdan o\'tkazish' })
  register(@Body() dto: RegisterAgentDto) {
    return this.agentService.register(dto);
  }

  @Get('agents')
  @ApiOperation({ summary: 'Barcha agentlar' })
  findAll(@Req() req?: any) {
    return this.agentService.findAll(req?.center_id);
  }

  @Get('agents/:id')
  @ApiOperation({ summary: 'Bitta agent' })
  findOne(@Param('id') id: string, @Req() req?: any) {
    return this.agentService.findOne(+id, req?.center_id);
  }

  @Patch('agents/:id')
  @ApiOperation({ summary: 'Agentni tahrirlash' })
  update(@Param('id') id: string, @Body() dto: UpdateAgentDto, @Req() req?: any) {
    return this.agentService.update(+id, dto, req?.center_id);
  }

  @Delete('agents/:id')
  @ApiOperation({ summary: 'Agentni o\'chirish' })
  remove(@Param('id') id: string, @Req() req?: any) {
    return this.agentService.remove(+id, req?.center_id);
  }

  @Post('agents/heartbeat')
  @ApiOperation({ summary: 'Heartbeat qabul qilish' })
  heartbeat(@Body() dto: HeartbeatDto) {
    return this.agentService.processHeartbeat(dto);
  }

  @Get('status')
  @ApiOperation({ summary: 'Agent statuslari' })
  getStatus(@Req() req?: any) {
    return this.agentService.getStatus(req?.center_id);
  }

  // ──── Jobs ────

  @Post('jobs')
  @ApiOperation({ summary: 'Chop etish job yaratish' })
  createJob(@Body() dto: CreateJobDto) {
    return this.agentService.createJob(dto);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Joblar ro\'yxati' })
  getJobs(
    @Query('agent_id') agent_id?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.agentService.getJobs(
      agent_id ? +agent_id : undefined,
      status,
      page ? +page : 1,
      limit ? +limit : 20,
    );
  }

  @Post('jobs/:id/retry')
  @ApiOperation({ summary: 'Jobni qayta urinish' })
  retryJob(@Param('id') id: string) {
    return this.agentService.retryJob(+id);
  }

  @Post('jobs/:id/cancel')
  @ApiOperation({ summary: 'Jobni bekor qilish' })
  cancelJob(@Param('id') id: string) {
    return this.agentService.cancelJob(+id);
  }

  // ──── Agent Actions ────

  @Post('agents/:id/restart')
  @ApiOperation({ summary: 'Agentni qayta ishga tushirish' })
  async restartAgent(@Param('id') id: string) {
    const agent = await this.agentService.findOne(+id);
    this.gateway.sendRestart(agent.agent_id);
    return { message: 'Qayta ishga tushirish buyrug\'i yuborildi' };
  }

  @Post('agents/:id/reconnect')
  @ApiOperation({ summary: 'Agentni qayta ulash' })
  async reconnectAgent(@Param('id') id: string) {
    const agent = await this.agentService.findOne(+id);
    this.gateway.sendReconnect(agent.agent_id);
    return { message: 'Qayta ulanish buyrug\'i yuborildi' };
  }

  @Post('agents/:id/update')
  @ApiOperation({ summary: 'Agentni yangilash' })
  async updateAgent(@Param('id') id: string) {
    const agent = await this.agentService.findOne(+id);
    this.gateway.sendAgentUpdate(agent.agent_id, { version: agent.latest_version });
    return { message: 'Yangilash buyrug\'i yuborildi' };
  }

  // ──── Logs ────

  @Get('logs')
  @ApiOperation({ summary: 'Job loglari' })
  getLogs(@Query('agent_id') agent_id?: string) {
    return this.agentService.getLogs(agent_id ? +agent_id : undefined);
  }

  @Get('agents/:id/logs')
  @ApiOperation({ summary: 'Agent loglari' })
  getAgentLogs(@Param('id') id: string) {
    return this.agentService.getLogs(+id);
  }

  // ──── Download ────

  @Get('download')
  @Header('Content-Type', 'application/octet-stream')
  @Header('Content-Disposition', 'attachment; filename="EduCRM-Print-Agent-Setup.exe"')
  @ApiOperation({ summary: 'Print Agent dasturini yuklash' })
  downloadAgent(@Res() res: Response) {
    const filePath = join(process.cwd(), 'public', 'agents', 'EduCRM-Print-Agent-Setup.exe');
    try {
      const file = createReadStream(filePath);
      file.pipe(res);
    } catch {
      res.status(404).json({ message: 'Agent fayli topilmadi. Iltimos, administratorga murojaat qiling.' });
    }
  }

  // ──── Test Print ────

  @Post('test')
  @ApiOperation({ summary: 'Test chek chop etish' })
  async testPrint(@Body() dto: { agent_id: number }) {
    const agent = await this.agentService.findOne(dto.agent_id);
    const job = await this.agentService.createJob({
      agent_id: dto.agent_id,
      payload: JSON.stringify({ type: 'test' }),
    });
    this.gateway.sendPrintJob(agent.agent_id, {
      jobId: job.id,
      type: 'test',
      data: {
        academyName: 'EduCRM',
        message: 'Printer Test',
        date: new Date().toISOString(),
        agentVersion: agent.agent_version,
        printerModel: agent.printer_model || agent.connected_printer,
      },
    });
    return { message: 'Test chek yuborildi', jobId: job.id };
  }
}
