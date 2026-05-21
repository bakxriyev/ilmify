import { Table, Model, Column, DataType, ForeignKey, BelongsTo, CreatedAt } from 'sequelize-typescript';
import { EducationCenterModel } from '../../education-centers/entities/education-center.entity';
import { StudentModel } from '../../students/model/student.entity';

@Table({ tableName: 'telegram_chats', timestamps: false })
export class TelegramChatModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => EducationCenterModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  center_id: number;

  @BelongsTo(() => EducationCenterModel)
  center: EducationCenterModel;

  @Column({ type: DataType.BIGINT, allowNull: false })
  chat_id: number;

  @ForeignKey(() => StudentModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  student_id: number;

  @BelongsTo(() => StudentModel)
  student: StudentModel;

  @Column({ type: DataType.STRING, allowNull: true })
  phone_number: string;

  @Column({ type: DataType.STRING, allowNull: true })
  first_name: string;

  @Column({ type: DataType.STRING, allowNull: true })
  last_name: string;

  @Column({ type: DataType.STRING, allowNull: true })
  username: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  is_active: boolean;

  @CreatedAt
  created_at: Date;
}
