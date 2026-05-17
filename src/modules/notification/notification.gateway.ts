// src/modules/notification/notification.gateway.ts
import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class NotificationGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId;
    const role = client.handshake.query.role;

    if (userId) client.join(`user-${userId}`);
    if (role) client.join(`role-${role}`);
  }

  sendToUser(userId: number, data: any) {
    this.server.to(`user-${userId}`).emit('notification', data);
  }

  sendToRole(role: string, data: any) {
    this.server.to(`role-${role}`).emit('notification', data);
  }

  sendToAll(data: any) {
    this.server.emit('notification', data);
  }
}