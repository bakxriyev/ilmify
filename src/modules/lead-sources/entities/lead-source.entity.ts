import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany, CreatedAt } from 'sequelize-typescript';
import { EducationCenterModel } from '../../education-centers/entities/education-center.entity';

@Table({ tableName: 'lead_sources', timestamps: true })
export class LeadSourceModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => EducationCenterModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  center_id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Column({ type: DataType.STRING, allowNull: false })
  platform: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  code: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  is_active: boolean;

  @BelongsTo(() => EducationCenterModel)
  center: EducationCenterModel;
}
