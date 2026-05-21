import { Controller, Post, Get, Body, Param, Patch, Put, UseGuards, ParseIntPipe, Query, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParentService } from './parent.service';
import { ParentLoginDto, CreateParentDto, UpdateParentDto, UpdateParentPasswordDto, LinkStudentDto } from './dto/parent.dto';
import { multerOptions } from '../../config/multer.config';
import { ChatAuthGuard } from '../chat/chat-auth.guard';

@ApiTags('Parents')
@Controller('parents')
export class ParentController {
  constructor(private parentService: ParentService) {}

  @Post('login')
  @ApiOperation({ summary: 'Ota-ona login' })
  async login(@Body() dto: ParentLoginDto) {
    return this.parentService.login(dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(ChatAuthGuard)
  @ApiOperation({ summary: 'Barcha ota-onalar royxati' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    return this.parentService.findAll(search, req?.center_id, Number(page) || 1, Number(limit) || 20);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(ChatAuthGuard)
  @ApiOperation({ summary: 'Bitta ota-onani olish' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.parentService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Yangi ota-ona qoshish' })
  async create(@Body() dto: CreateParentDto) {
    return this.parentService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(ChatAuthGuard)
  @ApiOperation({ summary: 'Ota-onani yangilash (rasm bilan)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', multerOptions))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParentDto,
    @UploadedFile() file?: Express.Multer.File,
    @Req() req?: any,
  ) {
    if (file) {
      dto.photo = file.filename;
    }
    return this.parentService.update(id, dto);
  }

  @Put(':id/password')
  @ApiBearerAuth()
  @UseGuards(ChatAuthGuard)
  @ApiOperation({ summary: 'Ota-ona parolini yangilash' })
  async updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParentPasswordDto,
  ) {
    return this.parentService.updatePassword(id, dto);
  }

  @Get(':id/children')
  @ApiBearerAuth()
  @UseGuards(ChatAuthGuard)
  @ApiOperation({ summary: 'Ota-onaning farzandlari' })
  async getChildren(@Param('id', ParseIntPipe) id: number) {
    return this.parentService.getChildren(id);
  }

  @Post(':id/children')
  @ApiBearerAuth()
  @UseGuards(ChatAuthGuard)
  @ApiOperation({ summary: 'Studentni ota-onaga biriktirish' })
  async linkStudent(@Param('id', ParseIntPipe) id: number, @Body() dto: LinkStudentDto) {
    return this.parentService.linkStudent(id, dto);
  }

  @Post(':parentId/children/:studentId')
  @ApiBearerAuth()
  @UseGuards(ChatAuthGuard)
  @ApiOperation({ summary: 'Studentni ota-onadan ajratish' })
  async unlinkStudent(
    @Param('parentId', ParseIntPipe) parentId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.parentService.unlinkStudent(parentId, studentId);
  }
}
