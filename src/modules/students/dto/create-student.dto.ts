import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class CreateStudentDto {
  @ApiProperty({
    example: 'Kamron',
    description: 'Talabaning ismi',
  })
  first_name: string;

  @ApiProperty({
    example: 'Baxriyev',
    description: 'Talabaning familiyasi',
  })
  last_name: string;

  @ApiProperty({
    example: 18,
    description: 'Talabaning yoshi',
    required: false,
  })
  @IsOptional()
  age: number;

  @ApiProperty({
    example: 'ali.karimov@gmail.com',
    description: 'Talabaning email manzili',
    required: false,
  })
  @IsOptional()
  email: string;

  @ApiProperty({
    example: '++998954546939',
    description: 'Telefon raqami',
    required: false,
  })
  @IsOptional()
  phone_number: string;

  @ApiProperty({
    example: 'https://example.com/photos/ali.jpg',
    description: 'Talabaning rasmi (URL yoki filename)',
    required: false,
  })
  @IsOptional()
  photo: string;

  @ApiProperty({
    example: 'kamron123',
    description: 'Parol (backendda hash qilinadi)',
  })
  password: string;

  @ApiProperty({
    example: 3,
    description: 'Guruh ID (foreign key)',
    required: false,
  })
  @IsOptional()
  group_id: number;
}
