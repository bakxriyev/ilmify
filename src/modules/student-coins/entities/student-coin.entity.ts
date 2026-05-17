import { Table, Model, Column, DataType, ForeignKey,BelongsTo } from 'sequelize-typescript';
import { StudentModel } from '../../students/model/student.entity';

@Table({
  tableName: 'student_coins',
  timestamps: true,
})
export class StudentCoinsModel extends Model {
  @ForeignKey(() => StudentModel)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    unique: true,
  })
  student_id: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  coins: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  scores: number;

  @BelongsTo(() => StudentModel, {
  foreignKey: 'student_id',
})
student: StudentModel;
}