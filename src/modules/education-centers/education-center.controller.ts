import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, Req, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { EducationCenterService } from './education-center.service';
import { CreateEducationCenterDto } from './dto/create-education-center.dto';
import { UpdateEducationCenterDto } from './dto/update-education-center.dto';
import { multerOptions } from '../../config/multer.config';

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

  @Get('my-public-token')
  @ApiOperation({ summary: 'Joriy adminning markaz tokenini qaytarish' })
  async getMyPublicToken(@Req() req?: any) {
    const centerId = req?.center_id || req?.headers?.['x-center-id'];
    if (!centerId) throw new NotFoundException('Markaz topilmadi');
    const token = await this.service.getOrCreatePublicToken(Number(centerId));
    return { token };
  }

  @Get('by-token/:token')
  @ApiOperation({ summary: 'Token orqali markazni topish (public)' })
  findByToken(@Param('token') token: string) {
    return this.service.findByToken(token);
  }

  @Delete('branches/:branchId')
  @ApiOperation({ summary: 'Filialni o\'chirish' })
  removeBranch(@Param('branchId') branchId: string) {
    return this.service.removeBranch(Number(branchId));
  }

  @Post(':id/logo')
  @ApiOperation({ summary: 'Markaz logotipini yuklash' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { logo: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('logo', {
    storage: diskStorage({
      destination: (_req: any, _file: any, cb: any) => {
        const folder = 'uploads/centers';
        if (!existsSync(folder)) mkdirSync(folder, { recursive: true });
        cb(null, folder);
      },
      filename: (_req: any, file: any, cb: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `logo-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req: any, file: any, cb: any) => {
      if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new NotFoundException('Fayl formati qo‘llab-quvvatlanmaydi'), false);
      }
    },
  }))
  async uploadLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new NotFoundException('Fayl yuklanmadi');
    return this.service.updateLogo(Number(id), file.filename);
  }

  @Delete(':id/logo')
  @ApiOperation({ summary: 'Markaz logotipini ochirish' })
  async removeLogo(@Param('id') id: string) {
    return this.service.updateLogo(Number(id), null);
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
}
