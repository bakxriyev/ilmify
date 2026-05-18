import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { GroupModel } from '../../groups/model/group.entity';
import { UnitModel } from '../../units/model';
import { RoomModel } from '../../rooms/entities/room.entity';

@Table({ tableName: 'group_lessons', timestamps: false })
export class GroupLessonModel extends Model<GroupLessonModel> {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => GroupModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  group_id: number;

  @ForeignKey(() => UnitModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  unit_id: number;

  @ForeignKey(() => RoomModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  room_id: number;

  @Column({ type: DataType.DATE, allowNull: false })
  date: Date;

  @Column({ type: DataType.TIME, allowNull: false })
  time: string;

  @Column({ type: DataType.TIME, allowNull: true })
  start_time: string;

  @Column({ type: DataType.TIME, allowNull: true })
  end_time: string;

  @Column({ type: DataType.ENUM('odd', 'even'), allowNull: false })
  parity: 'odd' | 'even';

  @BelongsTo(() => GroupModel, 'group_id')
  group: GroupModel;

  @BelongsTo(() => UnitModel, 'unit_id')
  unit: UnitModel;

  @BelongsTo(() => RoomModel, 'room_id')
  room: RoomModel;
}