import { 
  Table, 
  Model, 
  Column, 
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  CreatedAt,
  UpdatedAt
} from 'sequelize-typescript';
import { TeacherModel } from '../../teachers/model/teacher.model';
import { LevelModel } from '../../level/model/level.entity';
import { GroupStudentModel } from 'src/modules/group_student_model';
import { AttendanceModel } from '../../attendence/model/attendence.entity';
import { GroupLessonModel } from '../../group-lesson/entities/group-lesson.entity';
import { EducationCenterModel } from '../../education-centers/entities/education-center.entity';
import { RoomModel } from '../../rooms/entities/room.entity';

@Table({ 
  tableName: 'groups', 
  timestamps: true,                // ✅ enable automatic timestamps
  createdAt: 'created_at',          // optional: map to custom column name
  updatedAt: 'updated_at'           // optional: map to custom column name
})
export class GroupModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ForeignKey(() => TeacherModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  teacher_id: number;

  @ForeignKey(() => TeacherModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  support_teacher_id: number;

  @ForeignKey(() => LevelModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  level_id: number;

  @ForeignKey(() => RoomModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  room_id: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true, defaultValue: 0 })
  monthly_price: number;

  @Column({ type: DataType.BIGINT, allowNull: true, defaultValue: 0 })
  kp: number;

  // ✅ Timestamp columns (explicit definition is optional, but recommended)
  @CreatedAt
  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  created_at: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  updated_at: Date;

  // Teacher relations
  @BelongsTo(() => TeacherModel, { foreignKey: 'teacher_id', as: 'mainTeacher' })
  mainTeacher: TeacherModel;

  @BelongsTo(() => TeacherModel, { foreignKey: 'support_teacher_id', as: 'supportTeacher' })
  supportTeacher: TeacherModel;

  // Level relation
  @BelongsTo(() => LevelModel, { foreignKey: 'level_id', as: 'level' })
  level: LevelModel;

  // Room relation
  @BelongsTo(() => RoomModel, { foreignKey: 'room_id', as: 'room' })
  room: RoomModel;

  // Other relations
  @HasMany(() => GroupStudentModel, { foreignKey: 'group_id', as: 'groupStudents',onDelete: 'CASCADE' })
  groupStudents: GroupStudentModel[];

  @HasMany(() => AttendanceModel, { foreignKey: 'group_id', as: 'attendances' })
  attendances: AttendanceModel[];

  @HasMany(() => GroupLessonModel, { foreignKey: 'group_id', as: 'lessons',onDelete: 'CASCADE' })
  lessons: GroupLessonModel[];

  @ForeignKey(() => EducationCenterModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  center_id: number;

  @BelongsTo(() => EducationCenterModel)
  center: EducationCenterModel;
}