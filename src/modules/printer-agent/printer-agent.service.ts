import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { PrinterAgentModel, AgentStatus } from './entities/printer-agent.entity';
import { PrinterJobModel, JobStatus } from './entities/printer-job.entity';
import { RegisterAgentDto, HeartbeatDto, CreateJobDto, UpdateAgentDto } from './dto/printer-agent.dto';

@Injectable()
export class PrinterAgentService {
  private readonly logger = new Logger(PrinterAgentService.name);

  constructor(
    @InjectModel(PrinterAgentModel) private agentModel: typeof PrinterAgentModel,
    @InjectModel(PrinterJobModel) private jobModel: typeof PrinterJobModel,
  ) {}

  async register(dto: RegisterAgentDto): Promise<PrinterAgentModel> {
    const token = dto.agent_token || require('crypto').randomUUID();
    const existing = await this.agentModel.findOne({ where: { agent_id: dto.agent_id } });
    if (existing) {
      await existing.update({ ...dto, agent_token: token, status: AgentStatus.ONLINE, last_connection: new Date() });
      return existing.reload();
    }
    return this.agentModel.create({
      ...dto,
      agent_token: token,
      status: AgentStatus.ONLINE,
      latest_version: dto.agent_version,
      last_connection: new Date(),
      last_heartbeat: new Date(),
    } as any);
  }

  async findAll(center_id?: number): Promise<PrinterAgentModel[]> {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    return this.agentModel.findAll({
      where,
      order: [['status', 'ASC'], ['last_heartbeat', 'DESC']],
    });
  }

  async findOne(id: number, center_id?: number): Promise<PrinterAgentModel> {
    const where: any = { id };
    if (center_id) where.center_id = center_id;
    const agent = await this.agentModel.findOne({ where });
    if (!agent) throw new NotFoundException('Agent topilmadi');
    return agent;
  }

  async findByAgentId(agentId: string): Promise<PrinterAgentModel | null> {
    return this.agentModel.findOne({ where: { agent_id: agentId } });
  }

  async update(id: number, dto: UpdateAgentDto, center_id?: number): Promise<PrinterAgentModel> {
    const agent = await this.findOne(id, center_id);
    await agent.update(dto as any);
    return agent.reload();
  }

  async remove(id: number, center_id?: number): Promise<void> {
    const agent = await this.findOne(id, center_id);
    await agent.destroy();
  }

  async processHeartbeat(dto: HeartbeatDto): Promise<PrinterAgentModel> {
    const agent = await this.findByAgentId(dto.agent_id);
    if (!agent) throw new NotFoundException('Agent topilmadi');
    const updateData: any = {
      status: dto.status || AgentStatus.ONLINE,
      last_heartbeat: new Date(),
    };
    if (dto.cpu_usage !== undefined) updateData.cpu_usage = dto.cpu_usage;
    if (dto.memory_usage !== undefined) updateData.memory_usage = dto.memory_usage;
    if (dto.paper_out !== undefined) updateData.paper_out = dto.paper_out;
    if (dto.cover_open !== undefined) updateData.cover_open = dto.cover_open;
    if (dto.connected_printer !== undefined) updateData.connected_printer = dto.connected_printer;
    if (dto.printer_status !== undefined) updateData.printer_status = dto.printer_status;
    if (dto.last_error !== undefined) updateData.last_error = dto.last_error;
    await agent.update(updateData);
    return agent.reload();
  }

  async getStatus(center_id?: number): Promise<any> {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    const agents = await this.agentModel.findAll({ where });
    const total = agents.length;
    const online = agents.filter(a => a.status === AgentStatus.ONLINE).length;
    const offline = agents.filter(a => a.status === AgentStatus.OFFLINE).length;
    return { total, online, offline, agents };
  }

  // ──── Jobs ────

  async createJob(dto: CreateJobDto): Promise<PrinterJobModel> {
    return this.jobModel.create(dto as any);
  }

  async getJobs(agent_id?: number, status?: string, page = 1, limit = 20): Promise<{ rows: PrinterJobModel[]; count: number; page: number; totalPages: number }> {
    const where: any = {};
    if (agent_id) where.agent_id = agent_id;
    if (status) where.status = status;
    const offset = (page - 1) * limit;
    const { rows, count } = await this.jobModel.findAndCountAll({
      where, order: [['created_at', 'DESC']], offset, limit,
    });
    return { rows, count, page, totalPages: Math.ceil(count / limit) };
  }

  async updateJobStatus(jobId: number, status: string, error?: string): Promise<PrinterJobModel> {
    const job = await this.jobModel.findByPk(jobId);
    if (!job) throw new NotFoundException('Job topilmadi');
    const updateData: any = { status };
    if (error) updateData.error_message = error;
    if (status === JobStatus.PRINTING) updateData.started_at = new Date();
    if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) updateData.completed_at = new Date();
    await job.update(updateData);
    return job.reload();
  }

  async cancelJob(jobId: number): Promise<PrinterJobModel> {
    const job = await this.jobModel.findByPk(jobId);
    if (!job) throw new NotFoundException('Job topilmadi');
    if (job.status === JobStatus.COMPLETED) throw new Error('Tugallangan jobni bekor qilib bo\'lmaydi');
    await job.update({ status: JobStatus.CANCELLED, completed_at: new Date() });
    return job.reload();
  }

  async retryJob(jobId: number): Promise<PrinterJobModel> {
    const job = await this.jobModel.findByPk(jobId);
    if (!job) throw new NotFoundException('Job topilmadi');
    await job.update({
      status: JobStatus.PENDING,
      retry_count: job.retry_count + 1,
      error_message: null,
      started_at: null,
      completed_at: null,
    });
    return job.reload();
  }

  async getLogs(agent_id?: number, limit = 50): Promise<PrinterJobModel[]> {
    const where: any = {};
    if (agent_id) where.agent_id = agent_id;
    return this.jobModel.findAll({
      where, order: [['created_at', 'DESC']], limit,
    });
  }
}
