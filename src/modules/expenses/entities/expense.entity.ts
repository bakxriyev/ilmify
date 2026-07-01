import { Table, Column, Model, DataType, ForeignKey, BelongsTo, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { AdminModel } from '../../admin/model/admin.entity';
import { EducationCenterModel } from '../../education-centers/entities/education-center.entity';

@Table({ tableName: 'expenses', timestamps: true })
export class ExpenseModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  amount: number;

  @Column({ type: DataType.STRING, allowNull: false })
  description: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  date: string;

  @ForeignKey(() => AdminModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  created_by: number;

  @BelongsTo(() => AdminModel)
  admin: AdminModel;

  @ForeignKey(() => EducationCenterModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  center_id: number;

  @BelongsTo(() => EducationCenterModel)
  center: EducationCenterModel;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}
