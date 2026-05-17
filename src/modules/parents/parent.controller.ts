import { Controller, Post, Get, Body, Param, UseGuards, ParseIntPipe, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ParentService } from './parent.service';
import { ParentLoginDto, CreateParentDto, LinkStudentDto } from './dto/parent.dto';
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
  async findAll(@Query('search') search?: string, @Req() req?: any) {
    return this.parentService.findAll(search, req?.center_id);
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
