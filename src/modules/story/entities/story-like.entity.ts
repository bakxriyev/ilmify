import { Table, Column, Model, DataType, ForeignKey } from 'sequelize-typescript';
import { StoryModel } from './story.entity';

@Table({ tableName: 'story_likes', timestamps: true })
export class StoryLikeModel extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => StoryModel)
  @Column({ type: DataType.INTEGER, allowNull: false })
  story_id: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  student_id?: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  teacher_id?: number;
}