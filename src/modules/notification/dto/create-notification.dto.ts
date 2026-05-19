import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Bitta user ID uchun' })
  userId?: number;

  @ApiPropertyOptional({ description: 'Rolega yuborish (student, teacher, admin)' })
  role?: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  link?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  image?: any;

  // === YANGI QOSHIMCHALAR ===
  @ApiPropertyOptional({ description: 'Bitta studentga yuborish' })
  student_id?: number;

  @ApiPropertyOptional({ description: 'Bitta teacherga yuborish' })
  teacher_id?: number;

  @ApiPropertyOptional({ description: 'Guruhdagi barcha studentlarga yuborish', example: 1 })
  group_id?: number;

  @ApiPropertyOptional({ description: "Bir nechta guruhlarga yuborish", example: [1, 2, 3] })
  group_ids?: number[];

  @ApiPropertyOptional({ description: 'Bir nechta studentlarga yuborish', example: [1, 2, 3] })
  student_ids?: number[];

  @ApiPropertyOptional({ description: 'Bir nechta teacherlarga yuborish', example: [1, 2, 3] })
  teacher_ids?: number[];

  @ApiPropertyOptional({ description: 'Barcha studentlarga yuborish' })
  send_to_all_students?: boolean;

  @ApiPropertyOptional({ description: 'Barcha teacherlarga yuborish' })
  send_to_all_teachers?: boolean;

  @ApiPropertyOptional({ description: "Jo'natuvchi turi (admin, teacher)", default: 'admin' })
  sender_type?: string;

  @ApiPropertyOptional({ description: "Jo'natuvchi ID" })
  sender_id?: number;

  @ApiPropertyOptional({ description: 'Markaz ID' })
  center_id?: number;
}
