import { Table, Model, Column, DataType } from 'sequelize-typescript';
import { ApiProperty } from '@nestjs/swagger';

@Table({
  tableName: 'task_coin_logs',
  timestamps: true,
})
export class TaskCoinLogModel extends Model {
  @ApiProperty()
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  student_id: number;

  @ApiProperty({
    example: 15,
  })
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
  })
  task_id: number;

  @ApiProperty({
    example: 10,
  })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  coins: number;

  @ApiProperty({
    example: 'Task bajardi yoki darsga kelmadi',
  })
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  reason: string;
}