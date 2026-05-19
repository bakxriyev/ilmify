import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { StudentModel } from '../../students/model/student.entity';
import { TeacherModel } from '../../teachers/model/teacher.model';

@Table({ tableName: 'notifications', timestamps: true })
export class NotificationModel extends Model {
  @Column({ type: DataType.INTEGER, allowNull: true })
  user_id: number;

  @Column({ type: DataType.STRING, allowNull: true })
  role: string;

  @ForeignKey(() => StudentModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  student_id: number;

  @ForeignKey(() => TeacherModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  teacher_id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  title: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description: string;

  @Column({ type: DataType.STRING, allowNull: true })
  image: string;

  @Column({ type: DataType.STRING, allowNull: true })
  link: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  is_read: boolean;

  @Column({ type: DataType.STRING, allowNull: true, defaultValue: 'admin' })
  sender_type: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  sender_id: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  center_id: number;

  @BelongsTo(() => StudentModel)
  student: StudentModel;

  @BelongsTo(() => TeacherModel)
  teacher: TeacherModel;
}