import { Table, Model, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { StudentModel } from 'src/modules/students';
import { UnitModel } from 'src/modules/units';

@Table({ tableName: 'unit_results', timestamps: false })
export class UnitResultModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => StudentModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  student_id: number;

  @ForeignKey(() => UnitModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  unit_id: number;


  @Column({
  type: DataType.FLOAT,
  allowNull: false,
  defaultValue: 0,
})
percentage: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  is_completed: boolean;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  completed_at: Date;

  @BelongsTo(() => StudentModel)
  student: StudentModel;

  @BelongsTo(() => UnitModel)
  unit: UnitModel;
}