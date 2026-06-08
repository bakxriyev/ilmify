import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: true })
export class AuditGateway {
  private readonly logger = new Logger(AuditGateway.name);

  @WebSocketServer()
  server: Server;

  emitAudit(centerId: number, data: any) {
    try {
      if (this.server) {
        this.server.to(`center-${centerId}`).emit('audit', data);
      } else {
        this.logger.warn(`WebSocket server not ready yet, audit event queued for center ${centerId}`);
      }
    } catch (err) {
      this.logger.error('Failed to emit audit event via WebSocket', err);
    }
  }
}
