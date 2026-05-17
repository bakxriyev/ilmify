import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  CreatedAt,
} from "sequelize-typescript";
import { ChatRoomModel } from "./chat-room.entity";

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  FILE = "file",
}

export enum SenderType {
  TEACHER = "teacher",
  STUDENT = "student",
  ADMIN = "admin",
}

@Table({ tableName: "chat_messages", timestamps: false })
export class ChatMessageModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => ChatRoomModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  room_id: number;

  @BelongsTo(() => ChatRoomModel, { foreignKey: "room_id", as: "room" })
  room: ChatRoomModel;

  @Column({ type: DataType.BIGINT, allowNull: false })
  sender_id: number;

  @Column({
    type: DataType.ENUM(...Object.values(SenderType)),
    allowNull: false,
  })
  sender_type: SenderType;

  @Column({ type: DataType.STRING, allowNull: false })
  sender_name: string;

  @Column({ type: DataType.STRING, allowNull: true })
  sender_photo: string;

  @Column({
    type: DataType.ENUM(...Object.values(MessageType)),
    allowNull: false,
    defaultValue: MessageType.TEXT,
  })
  message_type: MessageType;

  @Column({ type: DataType.TEXT, allowNull: true })
  text: string;

  @Column({ type: DataType.STRING, allowNull: true })
  file_url: string;

  @Column({ type: DataType.STRING, allowNull: true })
  file_name: string;

  @Column({ type: DataType.BIGINT, allowNull: true })
  file_size: number;

  @CreatedAt
  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  created_at: Date;
}
