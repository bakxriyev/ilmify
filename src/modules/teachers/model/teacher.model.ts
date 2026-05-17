// src/modules/teachers/model/teacher.entity.ts
import { Table, Model, Column, DataType, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { GroupModel } from '../../groups/model/group.entity';
import { UserDeviceModel } from '../../user_device/entities/user_device.entity';
import { EducationCenterModel } from '../../education-centers/entities/education-center.entity';

export enum TeacherType {
  SUPPORT = 'SUPPORT',
  MAIN_TEACHER = 'MAIN_TEACHER',
}

@Table({ tableName: 'teachers', timestamps: false })
export class TeacherModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column(DataType.STRING)
  first_name: string;

  @Column(DataType.STRING)
  last_name: string;

  @Column({ type: DataType.STRING, unique: true })
  gmail: string;

  @Column(DataType.STRING)
  phone_number: string;

  @Column(DataType.STRING)
  password: string;

  @Column(DataType.STRING)
  age: string;

  @Column(DataType.STRING)
  photo: string;

  // New teacher_type enum field, required, default SUPPORT
  @Column({
    type: DataType.ENUM(...Object.values(TeacherType)),
    allowNull: false,
    defaultValue: TeacherType.SUPPORT,
  })
  teacher_type: TeacherType;

  @HasMany(() => GroupModel, { foreignKey: 'teacher_id', as: 'mainGroups',onDelete: 'SET NULL' })
  mainGroups: GroupModel[];

  @HasMany(() => GroupModel, { foreignKey: 'support_teacher_id', as: 'supportGroups',onDelete: 'SET NULL' })
  supportGroups: GroupModel[];

  @HasMany(() => UserDeviceModel, {
    foreignKey: 'teacher_id',
    scope: { user_type: 'teacher' },
  })
  devices: UserDeviceModel[];

  @ForeignKey(() => EducationCenterModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  center_id: number;

  @BelongsTo(() => EducationCenterModel)
  center: EducationCenterModel;
}