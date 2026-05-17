import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EducationCenterService } from './education-center.service';
import { CreateEducationCenterDto } from './dto/create-education-center.dto';
import { UpdateEducationCenterDto } from './dto/update-education-center.dto';

@ApiTags('Education Centers')
@Controller('education-centers')
export class EducationCenterController {
  constructor(private readonly service: EducationCenterService) {}

  @Get('verify')
  @ApiOperation({ summary: 'Markaz faolligini tekshirish' })
  async verify(@Req() req?: any) {
    const centerId = req?.center_id || req?.headers?.['x-center-id'];
    if (!centerId) return { active: true };
    const isActive = await this.service.isCenterActive(Number(centerId));
    if (!isActive) throw new ForbiddenException('MARKAZ_BLOKLANGAN');
    return { active: true };
  }

  @Post()
  @ApiOperation({ summary: 'Yangi o\'quv markaz yaratish' })
  create(@Body() dto: CreateEducationCenterDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha markazlar' })
  findAll() {
    return this.service.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Markazlar statistikasi' })
  getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Markaz ma\'lumotlari' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Markazni yangilash' })
  update(@Param('id') id: string, @Body() dto: UpdateEducationCenterDto) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Markazni o\'chirish' })
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }

  @Post(':id/branches')
  @ApiOperation({ summary: 'Filial qo\'shish' })
  addBranch(@Param('id') id: string, @Body() dto: { name: string; location?: string; phone?: string }) {
    return this.service.addBranch(Number(id), dto);
  }

  @Get(':id/branches')
  @ApiOperation({ summary: 'Filiallar ro\'yxati' })
  getBranches(@Param('id') id: string) {
    return this.service.getBranches(Number(id));
  }

  @Delete('branches/:branchId')
  @ApiOperation({ summary: 'Filialni o\'chirish' })
  removeBranch(@Param('branchId') branchId: string) {
    return this.service.removeBranch(Number(branchId));
  }
}
