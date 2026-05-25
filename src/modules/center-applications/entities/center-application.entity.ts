import { Table, Column, Model, DataType, CreatedAt } from 'sequelize-typescript';

export enum ApplicationStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Table({ tableName: 'center_applications', timestamps: true })
export class CenterApplicationModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  center_name: string;

  @Column({ type: DataType.STRING, allowNull: false })
  full_name: string;

  @Column({ type: DataType.STRING, allowNull: false })
  phone: string;

  @Column({ type: DataType.STRING, allowNull: false })
  region: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description: string;

  @Column({ type: DataType.ENUM(...Object.values(ApplicationStatus)), defaultValue: ApplicationStatus.NEW })
  status: ApplicationStatus;

  @CreatedAt
  created_at: Date;
}
