import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { TeacherAttendanceLocationModel } from './model/teacher-attendance-location.model';
import { TeacherAttendanceModel, AttendanceStatus } from './model/teacher-attendance.model';
import { TeacherModel } from '../teachers/model/teacher.model';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';
import { UpdateTeacherAttendanceLocationDto } from './dto';
import { AdminAttendanceQueryDto } from './dto/attendance-query.dto';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

@Injectable()
export class TeacherAttendanceService {
  constructor(
    @InjectModel(TeacherAttendanceLocationModel)
    private locationModel: typeof TeacherAttendanceLocationModel,
    @InjectModel(TeacherAttendanceModel)
    private attendanceModel: typeof TeacherAttendanceModel,
    @InjectModel(TeacherModel)
    private teacherModel: typeof TeacherModel,
    @InjectModel(EducationCenterModel)
    private centerModel: typeof EducationCenterModel,
  ) {}

  async getOrCreateLocation(center_id: number) {
    let location = await this.locationModel.findOne({
      where: { center_id },
      include: [{ model: EducationCenterModel, attributes: ['id', 'name', 'logo'] }],
    });
    if (!location) {
      const center = await this.centerModel.findByPk(center_id);
      if (!center) throw new NotFoundException("O'quv markazi topilmadi");
      location = await this.locationModel.create({
        center_id,
        name: center.name,
        latitude: 41.2995,
        longitude: 69.2401,
        address: center.location || '',
        radius: 100,
      });
    }
    return location;
  }

  async updateLocation(center_id: number, dto: UpdateTeacherAttendanceLocationDto) {
    const location = await this.locationModel.findOne({ where: { center_id } });
    if (!location) throw new NotFoundException('Lokatsiya topilmadi. Avval yarating.');
    await location.update(dto);
    return this.locationModel.findByPk(location.id, {
      include: [{ model: EducationCenterModel, attributes: ['id', 'name', 'logo'] }],
    });
  }

  async getLocationByCenter(center_id: number) {
    const location = await this.locationModel.findOne({
      where: { center_id },
      include: [{ model: EducationCenterModel, attributes: ['id', 'name', 'logo'] }],
    });
    if (!location) throw new NotFoundException('Bu markaz uchun lokatsiya sozlanmagan');
    return location;
  }

  async checkIn(
    teacher_id: number,
    dto: { latitude: number; longitude: number },
    selfie?: string,
  ) {
    const teacher = await this.teacherModel.findByPk(teacher_id);
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");
    if (!teacher.center_id) throw new BadRequestException("Siz o'quv markaziga biriktirilmagansiz");

    const location = await this.locationModel.findOne({ where: { center_id: teacher.center_id } });
    if (!location) throw new NotFoundException("O'quv markazi lokatsiyasi sozlanmagan. Admin bilan bog'laning.");
    if (!location.is_active) throw new BadRequestException('Lokatsiya faol emas');

    const distance = haversineDistance(
      dto.latitude, dto.longitude,
      Number(location.latitude), Number(location.longitude),
    );

    if (distance > location.radius) {
      throw new BadRequestException(
        `Siz o'quv markazidan uzoqdasiz (${Math.round(distance)}m). Maksimal ruxsat etilgan masofa: ${location.radius}m`,
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const existingToday = await this.attendanceModel.findOne({
      where: { teacher_id, date: today, status: AttendanceStatus.CHECKED_IN },
    });

    if (existingToday) {
      throw new BadRequestException('Siz bugun allaqachon davomat qilgansiz. Avval check-out qiling');
    }

    return this.attendanceModel.create({
      teacher_id,
      location_id: location.id,
      center_id: teacher.center_id,
      check_in: new Date(),
      check_in_latitude: dto.latitude,
      check_in_longitude: dto.longitude,
      distance: Math.round(distance * 100) / 100,
      date: today,
      status: AttendanceStatus.CHECKED_IN,
      selfie: selfie || null,
    });
  }

  async checkOut(teacher_id: number, dto: { latitude: number; longitude: number }) {
    const today = new Date().toISOString().split('T')[0];

    const attendance = await this.attendanceModel.findOne({
      where: { teacher_id, date: today, status: AttendanceStatus.CHECKED_IN },
      include: [{ model: TeacherAttendanceLocationModel }],
    });

    if (!attendance) {
      throw new BadRequestException('Siz hali check-in qilmagansiz yoki allaqachon check-out qilgansiz');
    }

    const location = attendance.location;
    if (location) {
      const distance = haversineDistance(
        dto.latitude, dto.longitude,
        Number(location.latitude), Number(location.longitude),
      );
      if (distance > location.radius) {
        throw new BadRequestException(
          `Siz o'quv markazidan uzoqdasiz (${Math.round(distance)}m). Check-out faqat markazda amalga oshirilishi mumkin`,
        );
      }
    }

    attendance.check_out = new Date();
    attendance.check_out_latitude = dto.latitude;
    attendance.check_out_longitude = dto.longitude;
    attendance.status = AttendanceStatus.CHECKED_OUT;
    await attendance.save();

    return attendance;
  }

  async getMyCenterLocation(teacher_id: number) {
    const teacher = await this.teacherModel.findByPk(teacher_id);
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");
    if (!teacher.center_id) throw new BadRequestException("Siz o'quv markaziga biriktirilmagansiz");

    return this.locationModel.findOne({
      where: { center_id: teacher.center_id, is_active: true },
      attributes: ['id', 'name', 'latitude', 'longitude', 'radius', 'address'],
    });
  }

  async getMyRecords(teacher_id: number, query: { page?: number; limit?: number; start_date?: string; end_date?: string }) {
    const { page = 1, limit = 20, start_date, end_date } = query;
    const offset = (page - 1) * limit;

    const where: any = { teacher_id };
    if (start_date || end_date) where.date = {};
    if (start_date) where.date[Op.gte] = start_date;
    if (end_date) where.date[Op.lte] = end_date;

    const { count, rows } = await this.attendanceModel.findAndCountAll({
      where,
      include: [
        { model: TeacherAttendanceLocationModel, attributes: ['id', 'name', 'latitude', 'longitude', 'radius'] },
      ],
      order: [['check_in', 'DESC']],
      limit,
      offset,
    });

    return {
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async findAllRecords(center_id: number, query: AdminAttendanceQueryDto) {
    const { page = 1, limit = 20, start_date, end_date, teacher_id, location_id } = query;
    const offset = (page - 1) * limit;

    const where: any = { center_id };
    if (start_date || end_date) where.date = {};
    if (start_date) where.date[Op.gte] = start_date;
    if (end_date) where.date[Op.lte] = end_date;
    if (teacher_id) where.teacher_id = teacher_id;
    if (location_id) where.location_id = location_id;

    const { count, rows } = await this.attendanceModel.findAndCountAll({
      where,
      include: [
        { model: TeacherModel, attributes: ['id', 'first_name', 'last_name', 'phone_number', 'photo'] },
        { model: TeacherAttendanceLocationModel, attributes: ['id', 'name', 'latitude', 'longitude', 'radius'] },
      ],
      order: [['date', 'DESC'], ['check_in', 'DESC']],
      limit,
      offset,
    });

    return {
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async findOneRecord(id: number) {
    const record = await this.attendanceModel.findByPk(id, {
      include: [
        { model: TeacherModel, attributes: ['id', 'first_name', 'last_name', 'phone_number', 'photo'] },
        { model: TeacherAttendanceLocationModel },
      ],
    });
    if (!record) throw new NotFoundException('Davomat yozuvi topilmadi');
    return record;
  }
}
