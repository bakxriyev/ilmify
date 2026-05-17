// dto/add-students-to-group.dto.ts
import { IsArray, IsNumber, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddStudentsToGroupDto {
  @ApiProperty({ 
    description: 'Array of student IDs to add to group',
    example: [1, 2, 3, 4, 5]
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  student_ids: number[];
}