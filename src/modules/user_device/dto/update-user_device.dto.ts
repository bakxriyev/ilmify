import { PartialType } from '@nestjs/swagger';
import { CreateUserDeviceDto } from './create-user_device.dto';

export class UpdateUserDeviceDto extends PartialType(CreateUserDeviceDto) {}
