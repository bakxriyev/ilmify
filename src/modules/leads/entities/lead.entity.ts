import { Table, Column, Model, DataType, ForeignKey, BelongsTo, CreatedAt } from 'sequelize-typescript';
import { EducationCenterModel } from '../../education-centers/entities/education-center.entity';
import { LeadSourceModel } from '../../lead-sources/entities/lead-source.entity';

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  INTERESTED = 'interested',
  NOT_INTERESTED = 'not_interested',
  ENROLLED = 'enrolled',
  ARCHIVED = 'archived',
}

@Table({ tableName: 'leads', timestamps: true })
export class LeadModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => EducationCenterModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  center_id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  first_name: string;

  @Column({ type: DataType.STRING, allowNull: false })
  last_name: string;

  @Column({ type: DataType.STRING, allowNull: false })
  phone_number: string;

  @Column({ type: DataType.STRING, allowNull: true })
  comment: string;

  @Column({ type: DataType.ENUM(...Object.values(LeadStatus)), defaultValue: LeadStatus.NEW })
  status: LeadStatus;

  @ForeignKey(() => LeadSourceModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  source_id: number;

  @Column({ type: DataType.STRING, allowNull: true })
  source_platform: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  callback_date: string;

  @Column({ type: DataType.DATE, allowNull: true })
  contacted_at: Date;

  @CreatedAt
  created_at: Date;

  @BelongsTo(() => EducationCenterModel)
  center: EducationCenterModel;

  @BelongsTo(() => LeadSourceModel)
  source: LeadSourceModel;
}
