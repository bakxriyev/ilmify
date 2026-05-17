import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { UserDeviceService } from './user_device.service';
// import { AdminGuard } from '../../guards/admin.guard'; // Agar admin guard bo'lsa

@Controller('api/user-devices')
// @UseGuards(AdminGuard) // Faqat admin ko'rishi kerak
export class UserDeviceController {
  constructor(private readonly userDeviceService: UserDeviceService) {}

  /**
   * GET /api/user-devices - Barcha sessiyalar
   */
  @Get()
  async findAll(
    @Query('user_id', ParseIntPipe) user_id?: number,
  ) {
    return this.userDeviceService.findAll({
      user_id
    });
  }

  /**
   * GET /api/user-devices/stats - Statistika
   */
  @Get('stats')
  async getStats() {
    return this.userDeviceService.getStats();
  }

  /**
   * GET /api/user-devices/:id - Bitta sessiya
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userDeviceService.findOne(id);
  }

  /**
   * GET /api/user-devices/user/:type/:id - User ning sessiyalari
   */
  @Get('user/:type/:id')
  async findByUser(
    @Param('type') type: 'student' | 'teacher',
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.userDeviceService.findByUser(type, id);
  }

  /**
   * POST /api/user-devices/:id/deactivate - Sessiyani deaktiv qilish
   */
  @Post(':id/deactivate')
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.userDeviceService.deactivate(id);
  }

  /**
   * POST /api/user-devices/user/:type/:id/deactivate-all - Barcha sessiyalarni o'chirish
   */
  @Post('user/:type/:id/deactivate-all')
  async deactivateAll(
    @Param('type') type: 'student' | 'teacher',
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.userDeviceService.deactivateAllByUser(type, id);
  }

  /**
   * POST /api/user-devices/cleanup - Eski sessiyalarni tozalash
   */
  @Post('cleanup')
  async cleanup(@Query('days', ParseIntPipe) days?: number) {
    return this.userDeviceService.cleanupOldSessions(days);
  }

  /**
   * DELETE /api/user-devices/:id - Sessiyani o'chirish
   */
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.userDeviceService.delete(id);
  }
}