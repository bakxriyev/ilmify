// src/modules/levels/model.ts
import { Table, Model, Column, DataType, HasMany } from 'sequelize-typescript';
import { UnitModel } from '../../units/model/unit.entity';
import { GroupModel } from '../../groups/model/group.entity';

@Table({ tableName: 'levels', timestamps: false })
export class LevelModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  name: string;

  @Column({ type: DataType.STRING, allowNull: true })
  title?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description?: string;

  @HasMany(() => UnitModel)
  units: UnitModel[];

  @HasMany(() => GroupModel, { foreignKey: 'level_id', as: 'groups' })
  groups: GroupModel[];
}