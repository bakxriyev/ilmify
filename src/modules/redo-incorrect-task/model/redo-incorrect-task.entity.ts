import { Table, Model, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { StudentModel } from 'src/modules/students';
import { ExerciseModel } from 'src/modules/exercises/model/exercise.entity';
import { TaskModel } from 'src/modules/tasks/model/task.entity';
import { StudentAnswerModel } from 'src/modules/student-answer/model/student-answer.entity';

@Table({ tableName: 'redo_incorrect_tasks', timestamps: false })
export class RedoIncorrectTaskModel extends Model {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => StudentModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  student_id: number;

  @ForeignKey(() => ExerciseModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  exercise_id: number;

  @ForeignKey(() => TaskModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  task_id: number;

  @ForeignKey(() => StudentAnswerModel)
  @Column({ type: DataType.BIGINT, allowNull: false })
  old_answer_id: number;

  @Column({ type: DataType.TEXT, allowNull: false })
  new_answer_text: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false })
  is_correct: boolean;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  redone_at: Date;

  @BelongsTo(() => StudentModel)
  student: StudentModel;

  @BelongsTo(() => ExerciseModel)
  exercise: ExerciseModel;

  @BelongsTo(() => TaskModel)
  task: TaskModel;

  @BelongsTo(() => StudentAnswerModel)
  old_answer: StudentAnswerModel;
}