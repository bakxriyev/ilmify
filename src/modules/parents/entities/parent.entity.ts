import { Table, Model, Column, DataType, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { ParentStudentModel } from './parent-student.entity';
import { EducationCenterModel } from '../../education-centers/entities/education-center.entity';

@Table({ tableName: 'parents', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class ParentModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  first_name: string;

  @Column({ type: DataType.STRING, allowNull: false })
  last_name: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  phone_number: string;

  @Column({ type: DataType.STRING, allowNull: false })
  password: string;

  @Column({ type: DataType.STRING, allowNull: true })
  photo: string;

  @ForeignKey(() => EducationCenterModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  center_id: number;

  @BelongsTo(() => EducationCenterModel)
  center: EducationCenterModel;

  @HasMany(() => ParentStudentModel, { foreignKey: 'parent_id', as: 'children' })
  children: ParentStudentModel[];
}
