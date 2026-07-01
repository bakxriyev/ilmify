import { Table, Column, Model, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({ tableName: 'academy_settings', timestamps: false })
export class AcademySettingModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.BIGINT, allowNull: false, unique: true })
  center_id: number;

  @Column({ type: DataType.STRING(200), allowNull: true })
  academy_name: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  logo: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  address: string;

  @Column({ type: DataType.STRING(30), allowNull: true })
  phone1: string;

  @Column({ type: DataType.STRING(30), allowNull: true })
  phone2: string;

  @Column({ type: DataType.STRING(30), allowNull: true })
  phone3: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  email: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  website: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  telegram_bot_link: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  telegram_channel: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  instagram: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  facebook: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  youtube: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  tiktok: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  google_maps: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  working_hours: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  footer_text: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  receipt_header: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  receipt_footer: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  receipt_note: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  receipt_thank_you_text: string;

  @CreatedAt
  @Column({ type: DataType.DATE })
  created_at: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updated_at: Date;
}
