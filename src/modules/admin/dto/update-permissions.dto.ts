import { IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePermissionsDto {
  @ApiProperty({
    description: 'Ruxsatlar obyekti',
    example: { dashboard: true, students: true, payments: false },
  })
  @IsObject()
  permissions: Record<string, boolean>;
}
