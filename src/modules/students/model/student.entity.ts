// src/modules/students/model/student.entity.ts
import {
  Table,
  Model,
  Column,
  DataType,
  HasMany,
  ForeignKey,
  BelongsTo,
  HasOne
} from 'sequelize-typescript';
import { GroupModel } from 'src/modules/groups';
import { GroupStudentModel } from 'src/modules/group_student_model';
import { AttendanceModel } from '../../attendence/model/attendence.entity';
import { StudentAnswerModel } from 'src/modules/student-answer/model/student-answer.entity';
import { ExerciseResultModel } from '../../exercises_result/model/exercises_result.entity';
import { VocabAnswerModel } from 'src/modules/vocab_answers';
import { VocabResultModel } from 'src/modules/vocab_result';
import { UnitResultModel } from '../../unit_result/model/unit_result.entity';
import { UserDeviceModel } from '../../user_device/entities/user_device.entity';
import { StudentCoinsModel } from '../../student-coins/entities/student-coin.entity';
import { ParentStudentModel } from '../../parents/entities/parent-student.entity';
import { EducationCenterModel } from '../../education-centers/entities/education-center.entity';

@Table({ tableName: 'students', timestamps: false })
export class StudentModel extends Model<StudentModel> {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  first_name: string;

  @Column({ type: DataType.STRING, allowNull: false })
  last_name: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  age: number;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  email: string;

  @Column({ type: DataType.STRING, allowNull: true })
  phone_number: string;

  @Column({ type: DataType.STRING, allowNull: true })
  photo: string;

  @Column({ type: DataType.STRING, allowNull: false })
  password: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isActive: boolean;

  @Column({
  type: DataType.FLOAT,
  allowNull: false,
  defaultValue: 0,
})
percentage: number;

  @ForeignKey(() => GroupModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  group_id: number;

  @BelongsTo(() => GroupModel)
  group: GroupModel;

  @HasMany(() => GroupStudentModel)
  group_students: GroupStudentModel[];

  @HasMany(() => AttendanceModel)
  attendances: AttendanceModel[];

  @HasMany(() => StudentAnswerModel)
  student_answers: StudentAnswerModel[];

  @HasMany(() => ExerciseResultModel)
  exercise_results: ExerciseResultModel[];

  @HasMany(() => VocabAnswerModel)
  vocab_answers: VocabAnswerModel[];

  @HasMany(() => VocabResultModel)
  vocab_results: VocabResultModel[];

  @HasMany(() => UnitResultModel)
  unit_results: UnitResultModel[];

  @HasMany(() => UserDeviceModel, {
    foreignKey: 'student_id',
    scope: { user_type: 'student' },
  })
  devices: UserDeviceModel[];

  @HasOne(() => StudentCoinsModel, {
  foreignKey: 'student_id',
  as: 'coins',
})
coins: StudentCoinsModel;

  @HasMany(() => ParentStudentModel, { foreignKey: 'student_id', as: 'parent_links' })
  parent_links: ParentStudentModel[];

  @ForeignKey(() => EducationCenterModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  center_id: number;

  @BelongsTo(() => EducationCenterModel)
  center: EducationCenterModel;
}