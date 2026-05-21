import { Table, Model, Column, DataType, ForeignKey, BelongsTo, CreatedAt } from 'sequelize-typescript';
import { EducationCenterModel } from '../../education-centers/entities/education-center.entity';
import { TelegramTemplateModel } from './telegram-template.entity';

@Table({ tableName: 'telegram_broadcasts', timestamps: false })
export class TelegramBroadcastModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => EducationCenterModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  center_id: number;

  @BelongsTo(() => EducationCenterModel)
  center: EducationCenterModel;

  @ForeignKey(() => TelegramTemplateModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  template_id: number;

  @BelongsTo(() => TelegramTemplateModel)
  template: TelegramTemplateModel;

  @Column({ type: DataType.STRING, allowNull: false })
  target_type: string;

  @Column({ type: DataType.BIGINT, allowNull: true })
  target_id: number;

  @Column({ type: DataType.TEXT, allowNull: false })
  message_text: string;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  total_count: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  sent_count: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  failed_count: number;

  @Column({ type: DataType.STRING, defaultValue: 'pending' })
  status: string;

  @CreatedAt
  created_at: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  completed_at: Date;
}
