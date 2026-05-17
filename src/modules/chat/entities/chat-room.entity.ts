import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";
import { GroupModel } from "../../groups/model/group.entity";
import { ChatMessageModel } from "./chat-message.entity";

export enum ChatRoomType {
  STUDENT = "student",
  PARENT = "parent",
}

@Table({
  tableName: "chat_rooms",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [
    {
      unique: true,
      fields: ["group_id", "type"],
    },
  ],
})
export class ChatRoomModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => GroupModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  group_id: number;

  @Column({
    type: DataType.ENUM(...Object.values(ChatRoomType)),
    allowNull: false,
    defaultValue: ChatRoomType.STUDENT,
  })
  type: ChatRoomType;

  @BelongsTo(() => GroupModel, { foreignKey: "group_id", as: "group" })
  group: GroupModel;

  @HasMany(() => ChatMessageModel, { foreignKey: "room_id", as: "messages" })
  messages: ChatMessageModel[];

  @CreatedAt
  @Column({ type: DataType.DATE })
  created_at: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updated_at: Date;
}
