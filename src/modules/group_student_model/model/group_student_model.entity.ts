import { Table, Model, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { GroupModel } from 'src/modules/groups';
import { StudentModel } from 'src/modules/students';

@Table({ tableName: 'group_students', timestamps: false })
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
  
@BelongsTo(() => GroupModel, { as: 'group',onDelete: 'CASCADE' })
group: GroupModel;

@BelongsTo(() => StudentModel, { as: 'student' })
student: StudentModel;
}
