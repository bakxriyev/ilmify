import { Table, Column, Model, DataType, CreatedAt } from 'sequelize-typescript';

@Table({ tableName: 'audit_logs', timestamps: false })
export class AuditLogModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.BIGINT, allowNull: false })
  admin_id: number;

  @Column({ type: DataType.STRING(255), allowNull: false })
  admin_name: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  action: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  entity_type: string;

  @Column({ type: DataType.STRING(50), allowNull: true })
  entity_id: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  entity_name: string;

  @Column({ type: DataType.JSONB, allowNull: true })
  details: any;

  @Column({ type: DataType.TEXT, allowNull: true })
  description: string;

  @Column({ type: DataType.BIGINT, allowNull: true })
  center_id: number;

  @CreatedAt
  @Column({ type: DataType.DATE, allowNull: false })
  created_at: Date;
}
