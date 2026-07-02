import { Table, Column, Model, DataType, ForeignKey, BelongsTo, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { StudentModel } from '../../students/model/student.entity';
import { GroupModel } from '../../groups/model/group.entity';
import { EducationCenterModel } from '../../education-centers/entities/education-center.entity';

export enum PaymentStatus {
  PAID = 'paid',
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
}

@Table({ tableName: 'payments', timestamps: true, indexes: [
  { fields: ['student_id', 'month', 'year'] },
  { fields: ['month', 'year', 'status', 'center_id'] },
  { fields: ['month', 'year', 'group_id'] },
  { fields: ['group_id', 'student_id'] },
  { fields: ['center_id'] },
  { fields: ['payment_type'] },
] })
export class PaymentModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => StudentModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  student_id: number;

  @ForeignKey(() => GroupModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  group_id: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true })
  cash_amount: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true })
  card_amount: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  month: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  year: number;

  @Column({ type: DataType.ENUM(...Object.values(PaymentStatus)), defaultValue: PaymentStatus.UNPAID })
  status: PaymentStatus;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  paid_at: string;

  @Column({ type: DataType.STRING, allowNull: true })
  payment_type: string;

  @Column({ type: DataType.STRING, allowNull: true })
  note: string;

  @Column({ type: DataType.BIGINT, allowNull: true })
  created_by: number;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @BelongsTo(() => StudentModel)
  student: StudentModel;

  @BelongsTo(() => GroupModel)
  group: GroupModel;

  @ForeignKey(() => EducationCenterModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  center_id: number;

  @BelongsTo(() => EducationCenterModel)
  center: EducationCenterModel;
}
