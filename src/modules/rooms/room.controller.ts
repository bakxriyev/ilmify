import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RoomService } from './room.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomController {
  constructor(private roomService: RoomService) {}

  @Get()
  @ApiOperation({ summary: 'Barcha xonalar' })
  @ApiQuery({ name: 'search', required: false })
  async findAll(@Query('search') search?: string, @Req() req?: any) {
    return this.roomService.findAll(search, req?.center_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta xona' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Yangi xona qoshish' })
  async create(@Body() dto: CreateRoomDto, @Req() req?: any) {
    return this.roomService.create(dto, req?.center_id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Xonani tahrirlash' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoomDto) {
    return this.roomService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xonani ochirish' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.remove(id);
  }
}
