import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({ cors: true })
export class NotificationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  static ioServer: Server;

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    NotificationGateway.ioServer = server;
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    const role = client.handshake.query.role as string;
    const token = client.handshake.query.token as string;
    const centerId = client.handshake.query.centerId as string;

    if (token) {
      const secrets = [
        process.env.JWT_SECRET || 'your-secret-key',
        'secret123',
        process.env.JWT_ACCESS_SECRET || 'kamron',
      ].filter(Boolean);

      let verified = false;
      for (const secret of secrets) {
        try {
          jwt.verify(token, secret);
          verified = true;
          break;
        } catch {}
      }
      if (!verified) {
        client.disconnect();
        return;
      }
    }

    if (userId) client.join(`user-${userId}`);
    if (role) client.join(`role-${role}`);
    if (centerId) client.join(`center-${centerId}`);
  }

  handleDisconnect(client: Socket) {}

  sendToUser(userId: number, data: any) {
    this.server.to(`user-${userId}`).emit('notification', data);
  }

  sendToRole(role: string, data: any) {
    this.server.to(`role-${role}`).emit('notification', data);
  }

  sendToCenter(centerId: number, data: any) {
    this.server.to(`center-${centerId}`).emit('notification', data);
  }

  sendToAll(data: any) {
    this.server.emit('notification', data);
  }

  emitToCenter(event: string, centerId: number, data: any) {
    this.server.to(`center-${centerId}`).emit(event, data);
  }

  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }
}
