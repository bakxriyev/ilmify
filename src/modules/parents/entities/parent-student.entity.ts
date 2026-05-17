import { Table, Model, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { ParentModel } from './parent.entity';
import { StudentModel } from '../../students/model/student.entity';

@Table({ tableName: 'parent_students', timestamps: true, createdAt: 'created_at', updatedAt: false })
export class ParentStudentModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => ParentModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  parent_id: number;

  @ForeignKey(() => StudentModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  student_id: number;

  @BelongsTo(() => ParentModel, { foreignKey: 'parent_id', as: 'parent' })
  parent: ParentModel;

  @BelongsTo(() => StudentModel, { foreignKey: 'student_id', as: 'student' })
  student: StudentModel;
}
