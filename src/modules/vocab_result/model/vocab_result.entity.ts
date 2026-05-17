import { Table, Model, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { StudentModel } from 'src/modules/students';
import { UnitModel } from 'src/modules/units';
import { VocabModel } from 'src/modules/vocabulary';

@Table({ tableName: 'vocab_results', timestamps: false })
export class VocabResultModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => StudentModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  student_id: number;

  @ForeignKey(() => UnitModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  unit_id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  total_vocabs: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  correct_vocabs: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  incorrect_vocabs: number;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: false })
  percentage: number;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  completed_at: Date;

  @BelongsTo(() => StudentModel)
  student: StudentModel;

  @BelongsTo(() => UnitModel)
  unit: UnitModel;

   @ForeignKey(() => VocabModel)
  @Column
  vocabId: number;

  @BelongsTo(() => VocabModel)
  vocab: VocabModel;

}