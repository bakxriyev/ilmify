import { Table, Column, Model, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({ tableName: 'receipt_templates', timestamps: false, indexes: [
  { fields: ['center_id'] },
  { fields: ['is_default'] },
] })
export class ReceiptTemplateModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING(100), allowNull: false })
  name: string;

  @Column({ type: DataType.BIGINT, allowNull: false })
  center_id: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  is_default: boolean;

  @Column({ type: DataType.INTEGER, defaultValue: 48 })
  font_size: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  bold: boolean;

  @Column({ type: DataType.STRING(10), defaultValue: 'center' })
  align: string;

  @Column({ type: DataType.INTEGER, defaultValue: 32 })
  line_width: number;

  @Column({ type: DataType.STRING(20), defaultValue: '-=' })
  divider_char: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  show_logo: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  show_header: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  show_footer: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  show_qr_telegram: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  show_qr_website: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  show_qr_instagram: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  show_qr_verify: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  show_phones: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  show_social: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  show_thank_you: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  custom_header: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  custom_footer: string;

  @CreatedAt
  @Column({ type: DataType.DATE })
  created_at: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updated_at: Date;
}
