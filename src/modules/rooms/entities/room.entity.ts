import { Table, Model, Column, DataType, HasMany, ForeignKey, BelongsTo, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { GroupLessonModel } from '../../group-lesson/entities/group-lesson.entity';
import { EducationCenterModel } from '../../education-centers/entities/education-center.entity';

@Table({ tableName: 'rooms', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class RoomModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 20 })
  capacity: number;

  @ForeignKey(() => EducationCenterModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  center_id: number;

  @BelongsTo(() => EducationCenterModel)
  center: EducationCenterModel;

  @HasMany(() => GroupLessonModel, { foreignKey: 'room_id', as: 'lessons' })
  lessons: GroupLessonModel[];

  @CreatedAt
  @Column({ type: DataType.DATE })
  created_at: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updated_at: Date;
}
