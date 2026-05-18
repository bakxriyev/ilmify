import { Controller, Get, Post, Body, Patch, Param, Delete, Req, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LeadSourceService } from './lead-source.service';
import { CreateLeadSourceDto, UpdateLeadSourceDto } from './dto/lead-source.dto';

@ApiTags('Lead Sources')
@Controller('lead-sources')
export class LeadSourceController {
  constructor(private readonly service: LeadSourceService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi manba yaratish' })
  create(@Body() dto: CreateLeadSourceDto, @Req() req?: any) {
    return this.service.create(dto, req?.center_id || 1);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha manbalar' })
  findAll(@Req() req?: any) {
    return this.service.findAll(req?.center_id);
  }

  @Get('by-code/:code')
  @ApiOperation({ summary: 'Code orqali manba topish (public, auth kerak emas)' })
  async findByCode(@Param('code') code: string) {
    const source = await this.service.findByCode(code);
    if (!source) throw new NotFoundException('Manba topilmadi');
    return {
      id: source.id,
      name: source.name,
      platform: source.platform,
      code: source.code,
      center: source.center ? {
        id: source.center.id,
        name: source.center.name,
      } : null,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta manba' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Manbani yangilash' })
  update(@Param('id') id: string, @Body() dto: UpdateLeadSourceDto) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Manbani ochirish' })
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
