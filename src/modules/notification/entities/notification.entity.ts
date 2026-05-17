// src/modules/notification/entities/notification.entity.ts
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'notifications', timestamps: true })
export class NotificationModel extends Model {
  @Column({ type: DataType.INTEGER, allowNull: true })
  user_id: number;

  @Column({ type: DataType.STRING, allowNull: true })
  role: string;

  @Column({ type: DataType.STRING, allowNull: false })
  title: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description: string;

  // ✅ Oddiy string path
  @Column({ type: DataType.STRING, allowNull: true })
  image: string;

  @Column({ type: DataType.STRING, allowNull: true })
  link: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  is_read: boolean;
}