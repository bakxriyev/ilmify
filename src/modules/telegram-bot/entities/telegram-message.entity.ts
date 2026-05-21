import { Table, Model, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { EducationCenterModel } from '../../education-centers/entities/education-center.entity';

@Table({ tableName: 'telegram_messages', timestamps: true, createdAt: 'created_at', updatedAt: false })
export class TelegramMessageModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => EducationCenterModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  center_id: number;

  @BelongsTo(() => EducationCenterModel)
  center: EducationCenterModel;

  @Column({ type: DataType.BIGINT, allowNull: false })
  chat_id: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  from_bot: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  text: string;

  @Column({ type: DataType.STRING, defaultValue: 'text' })
  message_type: string;

  @Column({ type: DataType.BIGINT, allowNull: true })
  reply_to_id: number;

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  created_at: Date;
}
