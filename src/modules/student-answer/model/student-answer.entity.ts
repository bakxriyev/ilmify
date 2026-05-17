import { Table, Model, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { StudentModel } from 'src/modules/students';
import { UnitModel } from 'src/modules/units';
import { ExerciseModel } from 'src/modules/exercises/model/exercise.entity';
import { TaskModel } from 'src/modules/tasks/model/task.entity';

@Table({ tableName: 'student_answers', timestamps: false })
export class StudentAnswerModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => StudentModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  student_id: number;

  @ForeignKey(() => UnitModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  unit_id: number;

  @ForeignKey(() => ExerciseModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  exercise_id: number;

  @ForeignKey(() => TaskModel)
  @Column({ type: DataType.BIGINT, allowNull: true })
  task_id: number;

  @Column({ type: DataType.JSONB, allowNull: false })
  answer_text: any; // user javoblari array shaklida

  @Column({ type: DataType.BOOLEAN, allowNull: false })
  is_correct: boolean;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 1 })
  attempt_number: number;

  @Column({ type: DataType.FLOAT, allowNull: false, defaultValue: 0 })
  percentage: number; // task foizi

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  total_corrects: number; 

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  total_incorrects: number; 
@Column({ type: DataType.FLOAT, allowNull: false, defaultValue: 0 })
  total_percentage:number

  @Column({ type: DataType.STRING, allowNull: false })
  q_type: string; 

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  answered_at: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  completed_at: Date;

  // RELATIONS
  @BelongsTo(() => StudentModel)
  student: StudentModel;

  @BelongsTo(() => UnitModel)
  unit: UnitModel;

 @BelongsTo(() => ExerciseModel, {
  onDelete: 'SET NULL',
})
exercise: ExerciseModel;
 @BelongsTo(() => TaskModel, {
  onDelete: 'SET NULL',
})
task: TaskModel;
}
