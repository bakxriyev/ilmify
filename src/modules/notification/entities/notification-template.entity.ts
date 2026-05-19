import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'notification_templates', timestamps: true })
export class NotificationTemplateModel extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  title: string;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description: string;

  @Column({ type: DataType.STRING, allowNull: true })
  category: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  center_id: number;
}
