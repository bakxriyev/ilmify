import { Controller, Get, Put, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AcademySettingsService } from './academy-settings.service';
import { UpdateAcademySettingDto } from './dto/academy-setting.dto';

@ApiTags('Academy Settings')
@Controller('academy-settings')
export class AcademySettingsController {
  constructor(private readonly service: AcademySettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Akademiya sozlamalarini olish' })
  get(@Req() req?: any) {
    return this.service.get(req?.center_id);
  }

  @Put()
  @ApiOperation({ summary: 'Akademiya sozlamalarini yangilash' })
  update(@Body() dto: UpdateAcademySettingDto, @Req() req?: any) {
    return this.service.update(req?.center_id, dto);
  }
}
