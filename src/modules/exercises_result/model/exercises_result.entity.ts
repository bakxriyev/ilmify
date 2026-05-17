import { Table, Model, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { StudentModel } from '../../students/model/student.entity';
import { UnitModel } from '../../units/model/unit.entity';
import { ExerciseModel } from 'src/modules/exercises/model/exercise.entity';

@Table({ tableName: 'exercise_results', timestamps: false })
export class ExerciseResultModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => StudentModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  student_id: number;

  @ForeignKey(() => UnitModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  unit_id: number;

  @ForeignKey(() => ExerciseModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  exercise_id: number;

  @Column({
  type: DataType.FLOAT,
  allowNull: false,
  defaultValue: 0,
})
percentage: number;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  completed_at: Date;

  @BelongsTo(() => StudentModel)
  student: StudentModel;

  @BelongsTo(() => UnitModel)
  unit: UnitModel;

  @BelongsTo(() => ExerciseModel)
  exercise: ExerciseModel;
}
