import { Table, Model, Column, DataType } from 'sequelize-typescript';

@Table({ tableName: 'auto_notification_logs', timestamps: true })
export class AutoNotificationLogModel extends Model<AutoNotificationLogModel> {
  @Column({ type: DataType.BIGINT, allowNull: false })
  center_id: number;

  @Column({ type: DataType.BIGINT, allowNull: false })
  student_id: number;

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'payment_reminder' })
  notification_type: string;

  @Column({ type: DataType.DATE, allowNull: false })
  scheduled_time: Date;

  @Column({ type: DataType.BIGINT, allowNull: true })
  telegram_chat_id: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  telegram_sent: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  telegram_error: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  delivered: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  message_text: string;
}
