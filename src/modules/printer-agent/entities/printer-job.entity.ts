import { Table, Column, Model, DataType, ForeignKey, BelongsTo, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { PrinterAgentModel } from './printer-agent.entity';

export enum JobStatus {
  PENDING = 'pending',
  PRINTING = 'printing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Table({ tableName: 'printer_jobs', timestamps: false, indexes: [
  { fields: ['agent_id'] },
  { fields: ['status'] },
  { fields: ['payment_id'] },
] })
export class PrinterJobModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => PrinterAgentModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  agent_id: number;

  @Column({ type: DataType.BIGINT, allowNull: true })
  payment_id: number;

  @Column({ type: DataType.BIGINT, allowNull: true })
  receipt_id: number;

  @Column({ type: DataType.STRING(30), allowNull: true })
  receipt_number: string;

  @Column({ type: DataType.ENUM(...Object.values(JobStatus)), defaultValue: JobStatus.PENDING })
  status: string;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  amount: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  payload: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  error_message: string;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  retry_count: number;

  @Column({ type: DataType.INTEGER, defaultValue: 3 })
  max_retries: number;

  @Column({ type: DataType.DATE, allowNull: true })
  started_at: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  completed_at: Date;

  @BelongsTo(() => PrinterAgentModel)
  agent: PrinterAgentModel;

  @CreatedAt
  @Column({ type: DataType.DATE })
  created_at: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updated_at: Date;
}
