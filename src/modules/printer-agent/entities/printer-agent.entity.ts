import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, HasMany } from 'sequelize-typescript';
import { PrinterJobModel } from './printer-job.entity';

export enum AgentStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  NOT_INSTALLED = 'not_installed',
}

@Table({ tableName: 'printer_agents', timestamps: false, indexes: [
  { fields: ['center_id'] },
  { fields: ['agent_id'] },
  { fields: ['status'] },
] })
export class PrinterAgentModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING(100), allowNull: false, unique: true })
  agent_id: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  agent_token: string;

  @Column({ type: DataType.BIGINT, allowNull: false })
  center_id: number;

  @Column({ type: DataType.BIGINT, allowNull: true })
  branch_id: number;

  @Column({ type: DataType.STRING(255), allowNull: true })
  computer_name: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  windows_user: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  os_version: string;

  @Column({ type: DataType.STRING(50), allowNull: true })
  cpu_info: string;

  @Column({ type: DataType.STRING(50), allowNull: true })
  memory_info: string;

  @Column({ type: DataType.STRING(45), allowNull: true })
  local_ip: string;

  @Column({ type: DataType.STRING(45), allowNull: true })
  public_ip: string;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: AgentStatus.NOT_INSTALLED })
  status: string;

  @Column({ type: DataType.STRING(20), allowNull: true })
  agent_version: string;

  @Column({ type: DataType.STRING(20), allowNull: true })
  latest_version: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  update_available: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  installed_printers: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  connected_printer: string;

  @Column({ type: DataType.STRING(50), allowNull: true })
  printer_model: string;

  @Column({ type: DataType.JSONB, allowNull: true })
  printer_status: object;

  @Column({ type: DataType.DATE, allowNull: true })
  last_heartbeat: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  last_connection: Date;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  cpu_usage: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  memory_usage: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  enabled: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  paper_out: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  cover_open: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  last_error: string;

  @HasMany(() => PrinterJobModel)
  jobs: PrinterJobModel[];

  @CreatedAt
  @Column({ type: DataType.DATE })
  created_at: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updated_at: Date;
}
