import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LeadService } from './lead.service';
import { CreateLeadDto, CreatePublicLeadDto, RegisterTrialDto } from './dto/lead.dto';
import { UpdateLeadDto } from './dto/lead.dto';
import { EducationCenterService } from '../education-centers/education-center.service';
import { LeadSourceService } from '../lead-sources/lead-source.service';

@ApiTags('Leads')
@Controller('leads')
export class LeadController {
  constructor(
    private readonly service: LeadService,
    private readonly centerService: EducationCenterService,
    private readonly sourceService: LeadSourceService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Yangi lead yaratish (admin panel)' })
  create(@Body() dto: CreateLeadDto, @Req() req?: any) {
    const center_id = req?.center_id || req?.headers?.['x-center-id'] || 0;
    return this.service.create(dto, Number(center_id));
  }

  @Post('public')
  @ApiOperation({ summary: 'Yangi lead yaratish (public landing page, auth kerak emas). Token, source yoki center_id beriladi' })
  async createPublic(@Body() dto: CreatePublicLeadDto) {
    let center_id = dto.center_id || 0;
    if (dto.token) {
      const center = await this.centerService.findByToken(dto.token);
      center_id = center.id;
    } else if (dto.source_platform && !dto.center_id) {
      const source = await this.sourceService.findByCode(dto.source_platform);
      if (source?.center) {
        center_id = source.center.id;
      }
    }
    if (!center_id) {
      throw new BadRequestException('Markaz aniqlanmadi. Token yoki source kodi noto\'g\'ri');
    }
    return this.service.createPublic(dto, Number(center_id));
  }

  @Get('public/center/:token')
  @ApiOperation({ summary: 'Token orqali markaz ma\'lumotlarini olish (public)' })
  async getCenterByToken(@Param('token') token: string) {
    return this.centerService.findByToken(token);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha leadlar' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'source_id', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'exclude_status', required: false })
  findAll(
    @Req() req?: any,
    @Query('status') status?: string,
    @Query('source_id') source_id?: string,
    @Query('search') search?: string,
    @Query('exclude_status') exclude_status?: string,
  ) {
    return this.service.findAll(
      req?.center_id,
      status,
      source_id ? Number(source_id) : undefined,
      search,
      exclude_status,
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

  @Post(':id/register-trial')
  @ApiOperation({ summary: 'Leadni probniy darsga yozish (student yaratadi, guruhga qo\'shadi)' })
  registerTrial(@Param('id') id: string, @Body() dto: RegisterTrialDto, @Req() req?: any) {
    return this.service.registerTrial(Number(id), dto, Number(req?.center_id));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Leadni ochirish' })
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
