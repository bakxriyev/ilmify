import { Table, Column, Model, DataType, ForeignKey, BelongsTo, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { TeacherModel } from '../../teachers/model/teacher.model';
import { TeacherAttendanceLocationModel } from './teacher-attendance-location.model';
import { EducationCenterModel } from '../../education-centers/entities/education-center.entity';

export enum AttendanceStatus {
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out',
}

@Table({ tableName: 'teacher_attendance_records', timestamps: true })
export class TeacherAttendanceModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => TeacherModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  teacher_id: number;

  @BelongsTo(() => TeacherModel)
  teacher: TeacherModel;

  @ForeignKey(() => TeacherAttendanceLocationModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  location_id: number;

  @BelongsTo(() => TeacherAttendanceLocationModel)
  location: TeacherAttendanceLocationModel;

  @ForeignKey(() => EducationCenterModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  center_id: number;

  @BelongsTo(() => EducationCenterModel)
  center: EducationCenterModel;

  @Column({ type: DataType.DATE, allowNull: false })
  check_in: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  check_out: Date;

  @Column({ type: DataType.DECIMAL(10, 7), allowNull: false })
  check_in_latitude: number;

  @Column({ type: DataType.DECIMAL(10, 7), allowNull: false })
  check_in_longitude: number;

  @Column({ type: DataType.DECIMAL(10, 7), allowNull: true })
  check_out_latitude: number;

  @Column({ type: DataType.DECIMAL(10, 7), allowNull: true })
  check_out_longitude: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0 })
  distance: number;

  @Column({ type: DataType.ENUM(...Object.values(AttendanceStatus)), allowNull: false, defaultValue: AttendanceStatus.CHECKED_IN })
  status: AttendanceStatus;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  date: string;

  @Column({ type: DataType.STRING, allowNull: true })
  selfie: string;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}
