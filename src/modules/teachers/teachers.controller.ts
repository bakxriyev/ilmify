import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { CreateTeacherDto, UpdateTeacherDto } from './dto';
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
  @ApiOperation({ summary: 'Barcha teacherlarni olish' })
  async findAll(
    @Query('includeGroups', new ParseBoolPipe({ optional: true })) includeGroups?: boolean,
    @Req() req?: any,
  ) {
    return this.teacherService.findAll(includeGroups, req?.center_id);
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