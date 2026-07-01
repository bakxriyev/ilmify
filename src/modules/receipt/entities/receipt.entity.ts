import { Table, Column, Model, DataType, ForeignKey, BelongsTo, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { PaymentModel } from '../../payments/entities/payment.entity';
import { PrinterModel } from '../../printer/entities/printer.entity';
import { AdminModel } from '../../admin/model/admin.entity';

export enum ReceiptStatus {
  PENDING = 'pending',
  PRINTED = 'printed',
  FAILED = 'failed',
  REPRINTED = 'reprinted',
}

@Table({ tableName: 'receipts', timestamps: false, indexes: [
  { fields: ['payment_id'] },
  { fields: ['receipt_number'] },
  { fields: ['center_id'] },
  { fields: ['status'] },
] })
export class ReceiptModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING(30), allowNull: false, unique: true })
  receipt_number: string;

  @ForeignKey(() => PaymentModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  payment_id: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  amount: number;

  @Column({ type: DataType.DECIMAL(15, 2), defaultValue: 0 })
  discount: number;

  @Column({ type: DataType.DECIMAL(15, 2), defaultValue: 0 })
  penalty: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  total: number;

  @Column({ type: DataType.ENUM(...Object.values(ReceiptStatus)), defaultValue: ReceiptStatus.PENDING })
  status: ReceiptStatus;

  @ForeignKey(() => PrinterModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  printer_id: number;

  @Column({ type: DataType.STRING(45), allowNull: true })
  printer_ip: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  error_message: string;

  @Column({ type: DataType.BIGINT, allowNull: false })
  center_id: number;

  @ForeignKey(() => AdminModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  printed_by: number;

  @Column({ type: DataType.STRING(45), allowNull: true })
  client_ip: string;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  print_attempts: number;

  @Column({ type: DataType.DATE, allowNull: true })
  printed_at: Date;

  @CreatedAt
  @Column({ type: DataType.DATE })
  created_at: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updated_at: Date;

  @BelongsTo(() => PaymentModel)
  payment: PaymentModel;

  @BelongsTo(() => PrinterModel)
  printer: PrinterModel;
}
