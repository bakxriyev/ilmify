import { Table, Column, Model, DataType, ForeignKey, BelongsTo, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { EducationCenterModel } from '../../education-centers/entities/education-center.entity';

@Table({ tableName: 'teacher_attendance_locations', timestamps: true })
export class TeacherAttendanceLocationModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => EducationCenterModel)
  @Column({ type: DataType.BIGINT, allowNull: false, unique: true })
  center_id: number;

  @BelongsTo(() => EducationCenterModel)
  center: EducationCenterModel;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Column({ type: DataType.DECIMAL(10, 7), allowNull: false })
  latitude: number;

  @Column({ type: DataType.DECIMAL(10, 7), allowNull: false })
  longitude: number;

  @Column({ type: DataType.STRING, allowNull: true })
  address: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 100 })
  radius: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active: boolean;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}
