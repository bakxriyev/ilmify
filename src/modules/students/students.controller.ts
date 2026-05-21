import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  ParseIntPipe,
  Put,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { StudentService } from './students.service';
import {
  CreateStudentDto,
  UpdateStudentDto,
  UpdateStudentPasswordDto,
  StudentQueryDto,
  StudentResponseDto,
  BulkCreateStudentDto,
} from './dto/student.dto';
import { multerOptions } from '../../config/multer.config'

@ApiTags('Students')
@Controller('students')
@ApiBearerAuth()
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi student yaratish (rasm bilan)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Student ma’lumotlari va ixtiyoriy rasm',
    schema: {
      type: 'object',
      properties: {
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        email: { type: 'string' },
        phone_number: { type: 'string' },
        password: { type: 'string' },
        age: { type: 'string' },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Rasm fayli (jpg, png, gif)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Student yaratildi',
    type: StudentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Noto'g'ri ma'lumotlar",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email allaqachon mavjud',
  })
  @UseInterceptors(FileInterceptor('photo', multerOptions))
  async create(
    @Body() createStudentDto: CreateStudentDto,
    @UploadedFile() file?: Express.Multer.File,
    @Req() req?: any,
  ) {
    if (file) {
      createStudentDto.photo = file.filename;
    }
    return await this.studentService.create(createStudentDto, req?.center_id);
  }
    @Get('no-group')  
  @ApiOperation({ summary: "Guruhga biriktirilmagan studentlarni olish (group_id = null)" })
  async findWithoutGroup(@Req() req?: any) {
    return await this.studentService.findWithoutGroup(req?.center_id);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bir nechta student yaratish' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Studentlar yaratildi',
  })
  async bulkCreate(@Body() bulkCreateDto: BulkCreateStudentDto, @Req() req?: any) {
    return await this.studentService.bulkCreate(bulkCreateDto, req?.center_id);
  }

 @Get()
@ApiOperation({ summary: 'Barcha studentlarni olish' })
@ApiResponse({ status: 200, description: "Studentlar ro'yxati" })
async findAll(@Query() query: StudentQueryDto, @Req() req?: any) {
  return await this.studentService.findAll(query, req?.center_id);
}


  @Get('stats')
  @ApiOperation({ summary: 'Studentlar statistikasi' })
  async getStats(@Req() req?: any) {
    return await this.studentService.getStats(req?.center_id);
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: "Guruh bo'yicha studentlarni olish" })
  @ApiResponse({ status: HttpStatus.OK, description: 'Guruh studentlari' })
  async getStudentsByGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query() query: StudentQueryDto,
    @Req() req?: any,
  ) {
    return await this.studentService.getStudentsByGroup(groupId, query, req?.center_id);
  }

  @Patch('bulk/toggle-active')
  @ApiOperation({ summary: "Barcha studentlarni faol/nofaol qilish" })
  async bulkToggleActive(
    @Body() dto: { isActive: boolean },
    @Req() req?: any,
  ) {
    return await this.studentService.bulkToggleActive(dto.isActive, req?.center_id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Student statistikasini olish' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Student statistikasi' })
  async getStudentStatistics(@Param('id', ParseIntPipe) id: number) {
    return await this.studentService.getStudentStatistics(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta studentni olish' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student topildi',
    type: StudentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Student topilmadi',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.studentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Studentni yangilash (rasm bilan)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Yangilanadigan ma’lumotlar va ixtiyoriy rasm',
    schema: {
      type: 'object',
      properties: {
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        email: { type: 'string' },
        phone_number: { type: 'string' },
        age: { type: 'number' },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Yangi rasm fayli',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student yangilandi',
    type: StudentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Student topilmadi',
  })
  @UseInterceptors(FileInterceptor('photo', multerOptions))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStudentDto: UpdateStudentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updateStudentDto.photo = file.filename;
    }
    return await this.studentService.update(id, updateStudentDto);
  }

  @Put(':id/password')
  @ApiOperation({ summary: 'Student parolini yangilash' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Parol yangilandi' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Eski parol noto'g'ri",
  })
  async updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePasswordDto: UpdateStudentPasswordDto,
  ) {
    return await this.studentService.updatePassword(id, updatePasswordDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Studentni o'chirish" })
  @ApiResponse({ status: HttpStatus.OK, description: "Student o'chirildi" })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Student topilmadi',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.studentService.remove(id);
  }
}