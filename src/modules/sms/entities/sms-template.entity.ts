import { Table, Column, Model, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({ tableName: 'sms_templates', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class SmsTemplateModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING(50), allowNull: false })
  category: string;

  @Column({ type: DataType.STRING(200), allowNull: false })
  title: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  body: string;

  @Column({ type: DataType.JSONB, allowNull: true })
  variables: string[];

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  is_custom: boolean;

  @Column({ type: DataType.BIGINT, allowNull: true })
  center_id: number;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}
