import { Table, Model, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { StudentModel } from 'src/modules/students';
import { UnitModel } from 'src/modules/units';
import { VocabModel } from 'src/modules/vocabulary';

@Table({ tableName: 'vocab_answers', timestamps: false })
export class VocabAnswerModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => StudentModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  student_id: number;

  @ForeignKey(() => UnitModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  unit_id: number;

  @ForeignKey(() => VocabModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  vocab_id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  answer_text: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false })
  is_correct: boolean;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 1 })
  attempt_number: number;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  answered_at: Date;

  @BelongsTo(() => StudentModel)
  student: StudentModel;

  @BelongsTo(() => UnitModel)
  unit: UnitModel;

  @BelongsTo(() => VocabModel)
  vocab: VocabModel;
}
