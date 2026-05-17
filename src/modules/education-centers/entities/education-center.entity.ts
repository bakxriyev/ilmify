import { Table, Column, Model, DataType, HasMany, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { CenterBranchModel } from './center-branch.entity';

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

  @HasMany(() => CenterBranchModel, { foreignKey: 'center_id' })
  branches: CenterBranchModel[];

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}
