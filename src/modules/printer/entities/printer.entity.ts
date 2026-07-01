import { Table, Column, Model, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';

export enum PrinterType {
  USB = 'usb',
  LAN = 'lan',
}

export enum PrinterModelEnum {
  XP_T80 = 'xp-t80',
  XP_58 = 'xp-58',
  XP_365B = 'xp-365b',
  XP_370B = 'xp-370b',
}

@Table({ tableName: 'printers', timestamps: false, indexes: [
  { fields: ['center_id'] },
  { fields: ['is_default'] },
] })
export class PrinterModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING(100), allowNull: false })
  name: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  model: string;

  @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: PrinterType.USB })
  connection_type: PrinterType;

  @Column({ type: DataType.STRING(45), allowNull: true })
  ip_address: string;

  @Column({ type: DataType.INTEGER, defaultValue: 9100 })
  port: number;

  @Column({ type: DataType.STRING(255), allowNull: true })
  usb_device_name: string;

  @Column({ type: DataType.BIGINT, allowNull: false })
  center_id: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  is_default: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  enabled: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  auto_cut: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  cash_drawer: boolean;

  @Column({ type: DataType.INTEGER, defaultValue: 48 })
  receipt_width: number;

  @Column({ type: DataType.INTEGER, defaultValue: 3 })
  qr_size: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  auto_print: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  last_connected_at: Date;

  @CreatedAt
  @Column({ type: DataType.DATE })
  created_at: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updated_at: Date;
}
