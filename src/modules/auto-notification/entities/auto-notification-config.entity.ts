import { Table, Model, Column, DataType } from 'sequelize-typescript';

@Table({ tableName: 'auto_notification_configs', timestamps: true })
export class AutoNotificationConfigModel extends Model<AutoNotificationConfigModel> {
  @Column({ type: DataType.BIGINT, allowNull: false })
  center_id: number;

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'payment_reminder' })
  notification_type: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  enabled: boolean;

  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: '["09:00","14:00","20:00"]' })
  send_times: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  message_template: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  send_telegram: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  send_sms: boolean;

  @Column({ type: DataType.STRING, allowNull: true })
  sms_template_category: string;

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'Asia/Tashkent' })
  timezone: string;
}
