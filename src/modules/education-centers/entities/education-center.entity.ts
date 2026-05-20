import { Table, Column, Model, DataType, HasMany, ForeignKey, BelongsTo, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { CenterBranchModel } from './center-branch.entity';
import { TariffModel } from '../../tariffs/entities/tariff.entity';

@Table({ tableName: 'education_centers', timestamps: true })
export class EducationCenterModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Column({ type: DataType.STRING, allowNull: true })
  location: string;

  @Column({ type: DataType.STRING, allowNull: true })
  phone: string;

  @Column({ type: DataType.STRING, allowNull: true })
  logo: string;

  @Column({ type: DataType.DECIMAL(15, 2), defaultValue: 0 })
  balance: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  is_active: boolean;

  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, unique: true })
  public_lead_token: string;

  @ForeignKey(() => TariffModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  tariff_id: number;

  @BelongsTo(() => TariffModel)
  tariff: TariffModel;

  @Column({ type: DataType.DATE, allowNull: true })
  trial_ends_at: Date;

  @Column({ type: DataType.INTEGER, allowNull: true })
  tariff_duration: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  tariff_price: number;

  @Column({ type: DataType.DATE, allowNull: true })
  tariff_started_at: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  tariff_ends_at: Date;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  call_center_enabled: boolean;

  @Column({ type: DataType.JSON, defaultValue: {} })
  features: Record<string, boolean>;

  @HasMany(() => CenterBranchModel, { foreignKey: 'center_id' })
  branches: CenterBranchModel[];

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}
