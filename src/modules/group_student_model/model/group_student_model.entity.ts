import { Table, Model, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { GroupModel } from 'src/modules/groups';
import { StudentModel } from 'src/modules/students';

@Table({ tableName: 'group_students', timestamps: false, indexes: [
  { fields: ['group_id'] },
  { fields: ['student_id'] },
  { fields: ['group_id', 'student_id'] },
] })
export class GroupStudentModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => GroupModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  group_id: number;

  @ForeignKey(() => StudentModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  student_id: number;

  @Column({ type: DataType.DATE, allowNull: false })
  joined_date: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  left_date: Date;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  is_trial: boolean;

  @BelongsTo(() => GroupModel, { as: 'group', onDelete: 'CASCADE' })
  group: GroupModel;

  @BelongsTo(() => StudentModel, { as: 'student', onDelete: 'CASCADE' })
  student: StudentModel;
}
