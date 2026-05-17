// src/modules/user-device/model/user-device.entity.ts
import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import { StudentModel } from '../../students/model/student.entity';
import { TeacherModel } from '../../teachers/model/teacher.model';

@Table({
  tableName: 'user_devices',
  timestamps: true,
  indexes: [
    {
      name: 'unique_active_user_session',
      fields: ['user_type', 'user_id'],
      unique: true,
      where: { is_active: true }, // <-- bu yerda 100% ishlaydi
    },
    {
      name: 'idx_user_devices_jti',
      fields: ['jti'],
    },
    {
      name: 'idx_user_devices_device_id',
      fields: ['device_id'],
    },
  ],
})


@Table({ tableName: 'user_devices', timestamps: true })
export class UserDeviceModel extends Model<UserDeviceModel> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  // User type to distinguish student/teacher
  @Column({
    type: DataType.ENUM('student', 'teacher'),
    allowNull: false,
  })
  user_type: 'student' | 'teacher';

  // Generic user_id (references student.id or teacher.id)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  user_id: number;

  // Specific FKs for relations (optional constraints)
  @ForeignKey(() => StudentModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  student_id: number;

  @BelongsTo(() => StudentModel, { foreignKey: 'student_id', constraints: false })
  student: StudentModel;

  @ForeignKey(() => TeacherModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  teacher_id: number;

  @BelongsTo(() => TeacherModel, { foreignKey: 'teacher_id', constraints: false })
  teacher: TeacherModel;

  // Unique device identifier (e.g., fingerprint or UUID + user-agent hash)
  @Column({
    type: DataType.STRING(128),
    allowNull: false,
    unique: 'user_device_unique', // Ensures one active device per user
  })
  device_id: string;

  // JSON string with device details
  @Column({
    type: DataType.STRING(512),
    allowNull: true,
  })
  device_info: string; // e.g., { os, browser, userAgent, ip }

  // IP address at login
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  ip_address: string;

  // JWT ID (unique per token/session)
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  jti: string;

  // Last activity timestamp
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  last_active: Date;

  // Is this session active?
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  is_active: boolean;

}