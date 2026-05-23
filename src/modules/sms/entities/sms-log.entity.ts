import { Table, Column, Model, DataType, CreatedAt } from 'sequelize-typescript';
import { SmsStatus } from '../interfaces/sms.interface';

@Table({ tableName: 'sms_logs', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class SmsLogModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING(20), allowNull: false })
  phone: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  message: string;

  @Column({ type: DataType.ENUM('pending', 'sent', 'delivered', 'failed'), defaultValue: 'pending' })
  status: SmsStatus;

  @Column({ type: DataType.STRING(100), allowNull: true })
  eskiz_message_id: string;

  @Column({ type: DataType.DATE, allowNull: true })
  sent_at: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  delivered_at: Date;

  @Column({ type: DataType.BIGINT, allowNull: true })
  created_by: number;

  @Column({ type: DataType.JSONB, allowNull: true })
  metadata: any;

  @Column({ type: DataType.BIGINT, allowNull: true })
  center_id: number;

  @CreatedAt
  created_at: Date;
}
