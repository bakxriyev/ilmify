// src/modules/notification/notification.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { NotificationModel } from './entities/notification.entity';
import { NotificationGateway } from './notification.gateway';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Op } from 'sequelize';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(NotificationModel)
    private notificationModel: typeof NotificationModel,
    private gateway: NotificationGateway,
  ) {}

  async create(dto: CreateNotificationDto, imagePath?: string) {
    const notification = await this.notificationModel.create({
      user_id: dto.userId || null,
      role: dto.role || null,
      title: dto.title,
      description: dto.description,
      link: dto.link,
      image: imagePath, // ✅ string path
    });

    const payload = {
      id: notification.id,
      title: notification.title,
      description: notification.description,
      link: notification.link,
      image: notification.image ? notification.image : null,
      createdAt: notification.createdAt,
    };

    // Realtime
    if (dto.userId) this.gateway.sendToUser(dto.userId, payload);
    else if (dto.role) this.gateway.sendToRole(dto.role, payload);
    else this.gateway.sendToAll(payload);

    return notification;
  }

  async findAll() {
    return this.notificationModel.findAll({ order: [['createdAt', 'DESC']] });
  }

  async findUserNotifications(userId: number) {
    return this.notificationModel.findAll({
      where: {
        [Op.or]: [
          { user_id: userId },
          { user_id: null },
        ],
      },
      order: [['createdAt', 'DESC']],
    });
  }

  async findOne(id: number) {
    const notif = await this.notificationModel.findByPk(id);
    if (!notif) throw new NotFoundException('Notification not found');
    return notif;
  }

  async update(id: number, dto: UpdateNotificationDto) {
    const notif = await this.findOne(id);
    await notif.update(dto);
    return notif;
  }

  async remove(id: number) {
    const notif = await this.findOne(id);
    await notif.destroy();
    return { success: true };
  }
}