import { ApiProperty } from '@nestjs/swagger';

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
  })
  age: number;

  @ApiProperty({
    example: 'ali.karimov@gmail.com',
    description: 'Talabaning email manzili',
  })
  email: string;

  @ApiProperty({
    example: '++998954546939',
    description: 'Telefon raqami',
  })
  phone_number: string;

  @ApiProperty({
    example: 'https://example.com/photos/ali.jpg',
    description: 'Talabaning rasmi (URL yoki filename)',
  })
  photo: string;

  @ApiProperty({
    example: 'kamron123',
    description: 'Parol (backendda hash qilinadi)',
  })
  password: string;

  @ApiProperty({
    example: 3,
    description: 'Guruh ID (foreign key)',
  })
  group_id: number;
}
