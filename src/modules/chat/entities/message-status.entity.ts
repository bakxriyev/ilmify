import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  CreatedAt,
} from "sequelize-typescript";
import { ChatMessageModel, SenderType } from "./chat-message.entity";

@Table({ tableName: "message_statuses", timestamps: false })
export class MessageStatusModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => ChatMessageModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  message_id: number;

  @BelongsTo(() => ChatMessageModel, {
    foreignKey: "message_id",
    as: "message",
  })
  message: ChatMessageModel;

  @Column({ type: DataType.BIGINT, allowNull: false })
  user_id: number;

  @Column({
    type: DataType.ENUM(...Object.values(SenderType)),
    allowNull: false,
  })
  user_type: SenderType;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  is_read: boolean;

  @CreatedAt
  @Column({ type: DataType.DATE, allowNull: true })
  read_at: Date;
}
