import { Table, Model, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { EducationCenterModel } from '../../education-centers/entities/education-center.entity';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
}

@Table({ tableName: 'admin', timestamps: false })
export class AdminModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  full_name: string;

  @Column({ type: DataType.STRING, allowNull: false })
  email: string;

  @Column({ type: DataType.STRING, allowNull: false })
  password: string;

  @Column({ type: DataType.STRING, allowNull: true })
  photo: string;

  @Column({ type: DataType.STRING, allowNull: false })
  phone_number: string;

  @Column({ type: DataType.STRING, allowNull: true })
  refresh_token: string;

  @Column({ type: DataType.ENUM(...Object.values(AdminRole)), defaultValue: AdminRole.ADMIN })
  role: AdminRole;

  @ForeignKey(() => EducationCenterModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  center_id: number;

  @BelongsTo(() => EducationCenterModel)
  center: EducationCenterModel;
}
