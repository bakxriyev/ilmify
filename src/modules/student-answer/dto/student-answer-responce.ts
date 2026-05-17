export class StudentAnswerResponseDto {
  student_id: number;
  task_id: number;
  exercise_id: number;
  unit_id: number;
  totalCorrects: number;
  totalIncorrects: number;
  percentage: number;
  correctAnswers: string[];
  incorrectAnswers: string[];
}