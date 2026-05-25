import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CenterApplicationsService } from './center-applications.service';
import { CreateCenterApplicationDto, UpdateApplicationStatusDto } from './dto/create-center-application.dto';

@ApiTags('Center Applications')
@Controller()
export class CenterApplicationsController {
  constructor(private readonly service: CenterApplicationsService) {}

  @Post('center-applications/public')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'O\'quv markaz uchun ariza qoldirish (public, auth kerak emas)' })
  create(@Body() dto: CreateCenterApplicationDto) {
    return this.service.create(dto);
  }

  @Get('center-applications')
  @ApiOperation({ summary: 'Barcha arizalar (super-admin)' })
  findAll() {
    return this.service.findAll();
  }

  @Get('center-applications/:id')
  @ApiOperation({ summary: 'Bitta ariza' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch('center-applications/:id/status')
  @ApiOperation({ summary: 'Ariza statusini yangilash' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.service.updateStatus(id, dto);
  }

  @Delete('center-applications/:id')
  @ApiOperation({ summary: 'Arizani o\'chirish' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
