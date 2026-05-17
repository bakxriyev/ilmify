import { ApiProperty } from '@nestjs/swagger';

export class RewardTaskDto {
  @ApiProperty()
  studentId: number;

  @ApiProperty()
  taskId: number;

  @ApiProperty({
    example: 15,
  })
  coins: number;

  @ApiProperty({
    example: 'Task to‘g‘ri bajarildi',
  })
  reason?: string;
}