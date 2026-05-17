export class TaskStatisticsDto {
  taskId: number;
  questionText: string;
  questionType: string;
  totalAnswers: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracyRate: number;
  averageAttempts: number;
  mostCommonIncorrectAnswer?: string;
  redoAttempts: number;
  successfulRedos: number;
}