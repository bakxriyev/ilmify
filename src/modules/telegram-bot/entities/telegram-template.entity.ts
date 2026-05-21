import { Table, Model, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { EducationCenterModel } from '../../education-centers/entities/education-center.entity';

@Table({ tableName: 'telegram_templates', timestamps: true })
export class TelegramTemplateModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => EducationCenterModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  center_id: number;

  @BelongsTo(() => EducationCenterModel)
  center: EducationCenterModel;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  content: string;

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  created_at: Date;

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  updated_at: Date;
}
