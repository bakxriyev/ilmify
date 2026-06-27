import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { GroupService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto, QueryGroupDto } from './dto';
import { GenerateLessonsDto } from './dto/generate-lessons.dto';

@ApiTags('Groups')
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
@HttpCode(HttpStatus.CREATED)
@ApiOperation({
  summary: 'Yangi guruh yaratish',
  description: 'Yangi guruh qo\'shish. Teacher ID lar va Level ID mavjud bo\'lishi kerak. Start date, duration, time va parity berilsa, darslar avtomatik yaratiladi.',
})
@ApiBody({ type: CreateGroupDto })
@ApiResponse({
  status: 201,
  description: 'Guruh muvaffaqiyatli yaratildi',
})
@ApiResponse({
  status: 409,
  description: 'Bunday nomli guruh allaqachon mavjud',
})
@ApiResponse({
  status: 404,
  description: 'Teacher yoki Level topilmadi',
})
async create(@Body() createGroupDto: CreateGroupDto, @Req() req?: any) {
  return this.groupService.create(createGroupDto, req?.center_id);
}


  @Get()
  @ApiOperation({
    summary: 'Barcha guruhlarni olish',
    description: 'Barcha guruhlar ro\'yxatini olish. Pagination va filter imkoniyatlari bilan.',
  })
  @ApiResponse({
    status: 200,
    description: 'Guruhlar ro\'yxati',
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: 'Advanced English A1',
            teacher_id: 1,
            support_teacher_id: 2,
            level_id: 1,
            mainTeacher: {
              id: 1,
              first_name: 'John',
              last_name: 'Doe',
            },
            level: {
              id: 1,
              name: 'A1',
              title: 'Beginner',
            },
          },
        ],
        pagination: {
          total: 50,
          page: 1,
          limit: 10,
          totalPages: 5,
        },
      },
    },
  })
  async findAll(@Query() queryDto: QueryGroupDto, @Req() req?: any) {
    return this.groupService.findAll(queryDto, req?.center_id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Bitta guruhni olish',
    description: 'ID bo\'yicha guruh ma\'lumotlarini olish',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Guruh ID',
    example: 1,
  })
  @ApiQuery({
    name: 'include',
    required: false,
    type: String,
    description: 'Qo\'shimcha ma\'lumotlar: teacher, supportTeacher, level, students,lessons',
    example: 'teacher,level,students,lessons',
  })
  @ApiResponse({
    status: 200,
    description: 'Guruh topildi',
    schema: {
      example: {
        id: 1,
        name: 'Advanced English A1',
        teacher_id: 1,
        support_teacher_id: 2,
        level_id: 1,
        mainTeacher: {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
        },
        supportTeacher: {
          id: 2,
          first_name: 'Jane',
          last_name: 'Smith',
        },
        level: {
          id: 1,
          name: 'A1',
          title: 'Beginner',
          description: 'Elementary level',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Guruh topilmadi',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('include') include?: string,
  ) {
    return this.groupService.findOne(id, include);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Guruh ma\'lumotlarini yangilash',
    description: 'Guruh ma\'lumotlarini o\'zgartirish',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Guruh ID',
  })
  @ApiBody({ type: UpdateGroupDto })
  @ApiResponse({
    status: 200,
    description: 'Guruh yangilandi',
  })
  @ApiResponse({
    status: 404,
    description: 'Guruh, teacher yoki level topilmadi',
  })
  @ApiResponse({
    status: 409,
    description: 'Bunday nomli guruh allaqachon mavjud',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupService.update(id, updateGroupDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Guruhni o\'chirish',
    description: 'Guruhni butunlay o\'chirish',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Guruh ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Guruh o\'chirildi',
  })
  @ApiResponse({
    status: 404,
    description: 'Guruh topilmadi',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.groupService.remove(id);
  }

  @Get(':id/students')
  @ApiOperation({
    summary: 'Guruhdagi studentlarni olish',
    description: 'Guruhga tegishli barcha studentlar ro\'yxati',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Guruh ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Guruh studentlari',
    schema: {
      example: {
        groupId: 1,
        students: [
          {
            id: 1,
            first_name: 'Alice',
            last_name: 'Smith',
            email: 'alice@example.com',
          },
        ],
        total: 1,
      },
    },
  })
  async getGroupStudents(@Param('id', ParseIntPipe) id: number) {
    const students = await this.groupService.getGroupStudents(id);
    return {
      groupId: id,
      students,
      total: students.length,
    };
  }

@Post(':id/students/:studentId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Guruhga student qo\'shish',
    description: 'Mavjud studentni guruhga qo\'shish',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Guruh ID',
  })
  @ApiParam({
    name: 'studentId',
    type: Number,
    description: 'Student ID',
  })
  @ApiResponse({
    status: 201,
    description: 'Student guruhga qo\'shildi',
  })
  @ApiResponse({
    status: 404,
    description: 'Guruh yoki student topilmadi',
  })
  @ApiResponse({
    status: 409,
    description: 'Student allaqachon guruhda',
  })
  async addStudent(
    @Param('id', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body('joined_date') joined_date?: string,
  ) {
    return this.groupService.addStudentToGroup(groupId, studentId, joined_date);
  }

  @Delete(':id/students/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Guruhdan studentni o\'chirish',
    description: 'Studentni guruhdan chiqarish',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Guruh ID',
  })
  @ApiParam({
    name: 'studentId',
    type: Number,
    description: 'Student ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Student guruhdan o\'chirildi',
  })
  @ApiResponse({
    status: 404,
    description: 'Guruh, student yoki aloqa topilmadi',
  })
  async removeStudent(
    @Param('id', ParseIntPipe) groupId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    await this.groupService.removeStudentFromGroup(groupId, studentId);
  }


  @Get(':id/lessons')
  @ApiOperation({
    summary: 'Guruh vaqtlarini olish',
    description: 'Guruh vaqtlarini olish',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Guruh ID',
  })

async getLessons(@Param('id', ParseIntPipe) groupId: number) {
  const group = await this.groupService.findOne(groupId);
  return group.lessons;
}

@Post(':id/generate-lessons')
@HttpCode(HttpStatus.CREATED)
@ApiOperation({ summary: 'Guruhga darslar yaratish', description: 'Start date, duration, parity va time berilsa, darslar avtomatik yaratiladi' })
async generateLessons(
  @Param('id', ParseIntPipe) groupId: number,
  @Body() dto: GenerateLessonsDto,
) {
  return this.groupService.generateLessons(
    groupId,
    dto.start_date,
    dto.duration_months,
    dto.time,
    dto.parity as 'odd' | 'even' | 'everyday',
    dto.room_id,
    dto.start_time,
    dto.end_time,
    dto.weekdays,
  );
}
}
