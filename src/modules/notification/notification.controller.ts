import {
  Controller, Post, Body, UploadedFile, UseInterceptors, Get,
  Param, Patch, Delete, Query, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private service: NotificationService) {}

  @Post('send')
  @ApiOperation({ summary: 'Xabar yuborish (guruh, student, teacher, barcha)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/notifications',
        filename: (req, file, callback) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, unique + extname(file.originalname));
        },
      }),
    }),
  )
  @ApiBody({ type: CreateNotificationDto })
  async send(
    @Body() dto: CreateNotificationDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req?: any,
  ) {
    const imagePath = file ? `${file.filename}` : undefined;
    if (!dto.center_id && req?.center_id) dto.center_id = req.center_id;
    return this.service.send(dto, imagePath);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha xabarlar tarixi' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Req() req?: any) {
    return this.service.findAll(req?.center_id, page ? +page : 1, limit ? +limit : 20);
  }

  @Get('user/:id')
  @ApiOperation({ summary: "Userning xabarlari" })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findUser(
    @Param('id') id: number,
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findUserNotifications(+id, role, page ? +page : 1, limit ? +limit : 20);
  }

  @Get('unread/:userId')
  @ApiOperation({ summary: "O'qilmagan xabarlar soni" })
  @ApiQuery({ name: 'role', required: false })
  async unreadCount(@Param('userId') userId: number, @Query('role') role?: string) {
    return this.service.getUnreadCount(+userId, role);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: "Xabarni o'qilgan deb belgilash" })
  async markAsRead(@Param('id') id: number) {
    return this.service.markAsRead(+id);
  }

  @Patch('read-all/:userId')
  @ApiOperation({ summary: "Barcha xabarlarni o'qilgan deb belgilash" })
  @ApiQuery({ name: 'role', required: false })
  async markAllAsRead(@Param('userId') userId: number, @Query('role') role?: string) {
    return this.service.markAllAsRead(+userId, role);
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.service.findOne(+id);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.service.remove(+id);
  }

  // ============= Templates =============

  @Post('templates')
  @ApiOperation({ summary: 'Yangi shablon yaratish' })
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @Get('templates/all')
  @ApiOperation({ summary: 'Barcha shablonlar' })
  async findAllTemplates() {
    return this.service.findAllTemplates();
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: 'Shablonni tahrirlash' })
  async updateTemplate(@Param('id') id: number, @Body() dto: Partial<CreateTemplateDto>) {
    return this.service.updateTemplate(+id, dto);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: "Shablonni o'chirish" })
  async deleteTemplate(@Param('id') id: number) {
    return this.service.deleteTemplate(+id);
  }
}
