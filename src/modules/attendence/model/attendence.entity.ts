import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { GroupModel } from 'src/modules/groups/model/group.entity';
import { StudentModel } from 'src/modules/students/model/student.entity';
import { GroupLessonModel } from '../../group-lesson/entities/group-lesson.entity';

@Table({ tableName: 'attendances', timestamps: true })
export class AttendanceModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => GroupModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  group_id: number;

  @ForeignKey(() => StudentModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  student_id: number;

  @ForeignKey(() => GroupLessonModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  lesson_id: number;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  date: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false })
  is_present: boolean;

  @Column({ type: DataType.STRING, allowNull: true })
  reason?: string;

  @BelongsTo(() => GroupModel)
  group: GroupModel;

  @BelongsTo(() => StudentModel)
  student: StudentModel;

  @BelongsTo(() => GroupLessonModel)
  lesson: GroupLessonModel;
}