import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import { ChatService } from "./chat.service";
import { CreateMessageDto } from "./dto/create-message.dto";
import { Logger } from "@nestjs/common";

interface OnlineUser {
  userId: number;
  userType: "teacher" | "student" | "admin";
  userName: string;
  userPhoto: string;
  socketIds: Set<string>;
}

@WebSocketGateway({
  cors: { origin: "*", credentials: true },
  namespace: "/chat",
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private onlineUsers = new Map<string, OnlineUser>();
  private logger = new Logger("ChatGateway");

  constructor(
    private chatService: ChatService,
  ) {}

  private getUserKey(userType: string, userId: number): string {
    return `${userType}-${userId}`;
  }

  private verifyToken(token: string): any {
    const secrets = [
      "secret123",
      process.env.JWT_SECRET || "secret123",
      process.env.JWT_ACCESS_SECRET || "kamron",
    ].filter(Boolean);

    for (const secret of secrets) {
      try {
        return jwt.verify(token, secret);
      } catch {}
    }
    return null;
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.query?.token as string);

      if (!token) {
        client.emit("error", { message: "Token topilmadi" });
        client.disconnect();
        return;
      }

      const payload = this.verifyToken(token);
      if (!payload) {
        client.emit("error", { message: "Token yaroqsiz" });
        client.disconnect();
        return;
      }

      const userId = payload.sub || payload.id;
      const userType = payload.type || "student";
      const userKey = this.getUserKey(userType, userId);

      (client as any).user = {
        userId,
        userType,
        userName: payload.name || "",
        userPhoto: payload.photo || "",
      };

      let existing = this.onlineUsers.get(userKey);
      if (!existing) {
        existing = {
          userId,
          userType,
          userName: payload.name || "",
          userPhoto: payload.photo || "",
          socketIds: new Set(),
        };
        this.onlineUsers.set(userKey, existing);
      }
      existing.socketIds.add(client.id);

      client.join(`user-${userKey}`);

      this.server.emit("user_online", {
        userId,
        userType,
        userName: existing.userName,
        userPhoto: existing.userPhoto,
        onlineAt: new Date(),
      });

      this.logger.log(`Connected: ${userType}/${userId} (${client.id})`);
    } catch {
      client.emit("error", { message: "Token yaroqsiz" });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).user;
    if (!user) return;

    const userKey = this.getUserKey(user.userType, user.userId);
    const existing = this.onlineUsers.get(userKey);

    if (existing) {
      existing.socketIds.delete(client.id);
      if (existing.socketIds.size === 0) {
        this.onlineUsers.delete(userKey);
        this.server.emit("user_offline", {
          userId: user.userId,
          userType: user.userType,
          offlineAt: new Date(),
        });
        this.logger.log(`Disconnected: ${user.userType}/${user.userId}`);
      }
    }
  }

  @SubscribeMessage("join_room")
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number },
  ) {
    const user = (client as any).user;
    if (!user) return;

    const canAccess = await this.chatService.canAccessRoom(
      data.roomId,
      user.userId,
      user.userType,
    );

    if (!canAccess) {
      client.emit("error", { message: "Bu chatga kirish ruxsati yoq" });
      return;
    }

    client.join(`room-${data.roomId}`);
    client.emit("room_joined", { roomId: data.roomId });

    const members = await this.chatService.getRoomMembers(data.roomId);
    client.emit("room_users", { roomId: data.roomId, members });

    const onlineMembers = members.map((m: any) => {
      const key = this.getUserKey(m.userType, m.userId);
      const online = this.onlineUsers.get(key);
      return {
        userId: m.userId,
        userType: m.userType,
        userName: m.userName,
        userPhoto: m.userPhoto,
        isOnline: !!online,
        lastSeen: online ? null : m.lastSeen,
      };
    });

    client.emit("room_users_online", {
      roomId: data.roomId,
      members: onlineMembers,
    });
  }

  @SubscribeMessage("leave_room")
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number },
  ) {
    client.leave(`room-${data.roomId}`);
  }

  @SubscribeMessage("send_message")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number } & CreateMessageDto,
  ) {
    const user = (client as any).user;
    if (!user) return;

    const canAccess = await this.chatService.canAccessRoom(
      data.roomId,
      user.userId,
      user.userType,
    );
    if (!canAccess) {
      client.emit("error", { message: "Ruxsat yoq" });
      return;
    }

    const message = await this.chatService.createMessage({
      roomId: data.roomId,
      senderId: user.userId,
      senderType: user.userType,
      text: data.text,
      messageType: data.message_type || "text",
    });

    this.server.to(`room-${data.roomId}`).emit("new_message", message);
    return message;
  }

  @SubscribeMessage("typing")
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; isTyping: boolean },
  ) {
    const user = (client as any).user;
    if (!user) return;

    client.to(`room-${data.roomId}`).emit("typing", {
      roomId: data.roomId,
      userId: user.userId,
      userType: user.userType,
      userName: user.userName,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage("mark_read")
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; lastMessageId: number },
  ) {
    const user = (client as any).user;
    if (!user) return;

    await this.chatService.markAsRead(
      data.roomId,
      user.userId,
      user.userType,
      data.lastMessageId,
    );

    this.server.to(`room-${data.roomId}`).emit("message_read", {
      roomId: data.roomId,
      userId: user.userId,
      userType: user.userType,
      lastMessageId: data.lastMessageId,
    });
  }

  @SubscribeMessage("get_online_users")
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const users = Array.from(this.onlineUsers.values()).map((u) => ({
      userId: u.userId,
      userType: u.userType,
      userName: u.userName,
      userPhoto: u.userPhoto,
    }));

    client.emit("online_users", users);
  }

  getOnlineUserIds(): Map<string, OnlineUser> {
    return this.onlineUsers;
  }
}
