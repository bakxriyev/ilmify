import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Req,
  Query,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { TeacherService } from './teachers.service';
import { CreateTeacherDto, UpdateTeacherDto, UpdateTeacherPasswordDto } from './dto';
import { multerOptions } from '../../config/multer.config';
import { LoginTeacherDto } from './dto/login.teacher.dto';

@ApiTags('Teachers')
@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Yangi teacher yaratish (rasm bilan)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        email: { type: 'string' },
        phone_number: { type: 'string' },
        password: { type: 'string' },
        age: { type: 'number' },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Rasm fayli (jpg, png, gif)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('photo', multerOptions))
  async create(
    @Body() createTeacherDto: CreateTeacherDto,
    @UploadedFile() file?: Express.Multer.File,
    @Req() req?: any,
  ) {
    if (file) {
      createTeacherDto.photo = file.filename;
    }
    return this.teacherService.create(createTeacherDto, req?.center_id);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha teacherlarni olish (filter, pagination, sort)' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort_by') sort_by?: string,
    @Query('sort_order') sort_order?: string,
    @Query('first_name') first_name?: string,
    @Query('last_name') last_name?: string,
    @Query('gmail') gmail?: string,
    @Query('phone_number') phone_number?: string,
    @Query('group_id') group_id?: string,
    @Req() req?: any,
  ) {
    return this.teacherService.findAll({
      center_id: req?.center_id,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sort_by,
      sort_order: sort_order as 'asc' | 'desc',
      first_name,
      last_name,
      gmail,
      phone_number,
      group_id: group_id === 'notnull' ? 'notnull' : group_id ? parseInt(group_id) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta teacherni olish' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeGroups', new ParseBoolPipe({ optional: true })) includeGroups?: boolean,
  ) {
    return this.teacherService.findOne(id, includeGroups);
  }

  @Get(':id/groups')
  @ApiOperation({ summary: "Teacherning guruhlarini olish" })
  async getTeacherGroups(@Param('id', ParseIntPipe) id: number) {
    return this.teacherService.getTeacherGroups(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Teacherni yangilash (rasm bilan)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
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
  @UseInterceptors(FileInterceptor('photo', multerOptions))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTeacherDto: UpdateTeacherDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updateTeacherDto.photo = file.filename;
    }
    return this.teacherService.update(id, updateTeacherDto);
  }

  @Put(':id/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Teacher parolini yangilash' })
  async updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeacherPasswordDto,
  ) {
    return this.teacherService.updatePassword(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Teacherni o'chirish" })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.teacherService.remove(id);
  }

  @Post('login')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Teacher login (phone_number + password)' })
@ApiBody({ type: LoginTeacherDto })
async login(@Body() loginDto: LoginTeacherDto) {
  return this.teacherService.login(
    loginDto.phone_number,
    loginDto.password,
  );
}
}