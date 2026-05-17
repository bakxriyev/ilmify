import { Table, Model, Column, DataType } from 'sequelize-typescript';

@Table({
  tableName: 'teacher_coin_logs',
  timestamps: true,
})
export class TeacherCoinLogModel extends Model {
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  teacher_id: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  student_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  coins: number;

  @Column({
    type: DataType.STRING,
  })
  reason: string;
}