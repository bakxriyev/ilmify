import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LeadService } from './lead.service';
import { CreateLeadDto } from './dto/lead.dto';
import { UpdateLeadDto } from './dto/lead.dto';

@ApiTags('Leads')
@Controller('leads')
export class LeadController {
  constructor(private readonly service: LeadService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi lead yaratish (public landing page)' })
  create(@Body() dto: CreateLeadDto, @Req() req?: any) {
    const center_id = req?.center_id || req?.headers?.['x-center-id'] || 0;
    return this.service.create(dto, Number(center_id));
  }

  @Get()
  @ApiOperation({ summary: 'Barcha leadlar' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'source_id', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Req() req?: any,
    @Query('status') status?: string,
    @Query('source_id') source_id?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(
      req?.center_id,
      status,
      source_id ? Number(source_id) : undefined,
      search,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Lead statistikasi' })
  getStats(@Req() req?: any) {
    return this.service.getStats(req?.center_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta lead' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Leadni yangilash' })
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Leadni ochirish' })
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
