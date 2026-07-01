import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { PrinterAgentService } from './printer-agent.service';

@WebSocketGateway({
  cors: true,
  namespace: '/printer-agent',
})
export class PrinterAgentGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  static ioServer: Server;

  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PrinterAgentGateway.name);

  constructor(private agentService: PrinterAgentService) {}

  afterInit(server: Server) {
    PrinterAgentGateway.ioServer = server;
    this.logger.log('Printer Agent Gateway initialized');
  }

  handleConnection(client: Socket) {
    const agentId = client.handshake.query.agentId as string;
    const token = client.handshake.query.token as string;
    const centerId = client.handshake.query.centerId as string;

    if (!agentId || !token) {
      client.emit('error', { message: 'Missing agentId or token' });
      client.disconnect();
      return;
    }

    client.join(`agent-${agentId}`);
    if (centerId) client.join(`center-${centerId}`);

    this.logger.log(`Agent connected: ${agentId}`);
  }

  handleDisconnect(client: Socket) {
    const agentId = client.handshake.query.agentId as string;
    if (agentId) {
      this.agentService.findByAgentId(agentId).then(agent => {
        if (agent) {
          agent.update({ status: 'offline', last_connection: new Date() });
        }
      });
      this.logger.log(`Agent disconnected: ${agentId}`);
    }
  }

  // Agent → Server events
  @SubscribeMessage('heartbeat')
  handleHeartbeat(client: Socket, data: any) {
    this.agentService.processHeartbeat(data).then(agent => {
      client.emit('heartbeat_ack', { ok: true });
      const centerId = agent.center_id;
      const eventData = {
        agent_id: agent.agent_id,
        status: agent.status,
        cpu_usage: agent.cpu_usage,
        memory_usage: agent.memory_usage,
        last_heartbeat: agent.last_heartbeat,
        connected_printer: agent.connected_printer,
        paper_out: agent.paper_out,
        cover_open: agent.cover_open,
      };
      this.server.to(`center-${centerId}`).emit('agent_status', eventData);
      this.server.emit('heartbeat', eventData);
    }).catch(err => {
      client.emit('error', { message: err.message });
    });
  }

  @SubscribeMessage('print_success')
  handlePrintSuccess(client: Socket, data: { jobId: number; receiptId?: number }) {
    this.agentService.updateJobStatus(data.jobId, 'completed').then(job => {
      this.server.emit('print_success', { jobId: data.jobId, receiptId: data.receiptId });
      this.emitQueueUpdate(job.agent_id);
    });
  }

  @SubscribeMessage('print_failed')
  handlePrintFailed(client: Socket, data: { jobId: number; error: string }) {
    this.agentService.updateJobStatus(data.jobId, 'failed', data.error).then(job => {
      this.server.emit('print_failed', { jobId: data.jobId, error: data.error });
      this.emitQueueUpdate(job.agent_id);
    });
  }

  @SubscribeMessage('queue_updated')
  handleQueueUpdate(client: Socket, data: { agentId: number; queueSize: number }) {
    this.server.emit('queue_updated', data);
  }

  @SubscribeMessage('printer_online')
  handlePrinterOnline(client: Socket, data: { agentId: string }) {
    this.server.emit('printer_online', data);
  }

  @SubscribeMessage('printer_offline')
  handlePrinterOffline(client: Socket, data: { agentId: string }) {
    this.server.emit('printer_offline', data);
  }

  @SubscribeMessage('printer_error')
  handlePrinterError(client: Socket, data: { agentId: string; error: string }) {
    this.server.emit('printer_error', data);
  }

  // Server → Agent events
  sendPrintJob(agentId: string, jobData: any) {
    this.server.to(`agent-${agentId}`).emit('print_job', jobData);
  }

  sendAgentUpdate(agentId: string, updateData: any) {
    this.server.to(`agent-${agentId}`).emit('agent_update', updateData);
  }

  sendRestart(agentId: string) {
    this.server.to(`agent-${agentId}`).emit('agent_restart');
  }

  sendReconnect(agentId: string) {
    this.server.to(`agent-${agentId}`).emit('agent_reconnect');
  }

  emitToCenter(event: string, centerId: number, data: any) {
    this.server.to(`center-${centerId}`).emit(event, data);
  }

  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  private emitQueueUpdate(agentId: number) {
    this.agentService.getJobs(agentId).then(result => {
      this.server.emit('queue_updated', { agentId, queueSize: result.count });
    });
  }
}
