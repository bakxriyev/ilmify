import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { LeadModel, LeadStatus } from './entities/lead.entity';
import { LeadSourceModel } from '../lead-sources/entities/lead-source.entity';
import { CreateLeadDto, CreatePublicLeadDto, RegisterTrialDto } from './dto/lead.dto';
import { UpdateLeadDto } from './dto/lead.dto';
import { StudentModel } from '../students/model/student.entity';
import { GroupStudentModel } from '../group_student_model';

@Injectable()
export class LeadService {
  constructor(
    @InjectModel(LeadModel) private leadModel: typeof LeadModel,
    @InjectModel(LeadSourceModel) private sourceModel: typeof LeadSourceModel,
    @InjectModel(StudentModel) private studentModel: typeof StudentModel,
    @InjectModel(GroupStudentModel) private groupStudentModel: typeof GroupStudentModel,
  ) {}

  async create(dto: CreateLeadDto, center_id: number) {
    return this.leadModel.create({
      ...dto,
      center_id,
      status: LeadStatus.NEW,
    });
  }

  async createPublic(dto: CreatePublicLeadDto, center_id: number) {
    return this.leadModel.create({
      first_name: dto.first_name,
      last_name: dto.last_name,
      phone_number: dto.phone_number,
      comment: dto.comment,
      source_id: dto.source_id,
      source_platform: dto.source_platform,
      center_id,
      status: LeadStatus.NEW,
    });
  }

  async findAll(center_id?: number, status?: string, source_id?: number, search?: string, exclude_status?: string) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    if (status) where.status = status;
    if (source_id) where.source_id = source_id;
    if (exclude_status) {
      where.status = { [Op.ne]: exclude_status };
    }
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { phone_number: { [Op.iLike]: `%${search}%` } },
      ];
    }

    return this.leadModel.findAll({
      where,
      include: [{ model: LeadSourceModel, attributes: ['id', 'name', 'platform'] }],
      order: [['created_at', 'DESC']],
    });
  }

  async findOne(id: number) {
    const lead = await this.leadModel.findByPk(id, {
      include: [{ model: LeadSourceModel }],
    });
    if (!lead) throw new NotFoundException('Lead topilmadi');
    return lead;
  }

  async update(id: number, dto: UpdateLeadDto) {
    const lead = await this.findOne(id);
    const updateData: any = { ...dto };
    if (dto.status === LeadStatus.CONTACTED) {
      updateData.contacted_at = lead.contacted_at || new Date();
    }
    await lead.update(updateData);
    return this.findOne(id);
  }

  async remove(id: number) {
    const lead = await this.findOne(id);
    await lead.destroy();
    return { message: "Lead o'chirildi" };
  }

  async registerTrial(id: number, dto: RegisterTrialDto, center_id?: number) {
    const lead = await this.findOne(id);
    if (lead.status === LeadStatus.ARCHIVED) {
      throw new BadRequestException('Arxivlangan leadni probniy darsga yozib bo\'lmaydi');
    }

    if (!dto.group_id) {
      throw new BadRequestException('Guruh ID kiritilishi shart');
    }

    const existingStudent = await this.studentModel.findOne({
      where: {
        [Op.or]: [
          { phone_number: lead.phone_number },
          { email: `${lead.phone_number}@probniy.uz` },
        ],
      },
    });

    let student: StudentModel;
    if (existingStudent) {
      student = existingStudent;
    } else {
      student = await this.studentModel.create({
        first_name: lead.first_name,
        last_name: lead.last_name,
        phone_number: lead.phone_number,
        email: `${lead.phone_number}@probniy.uz`,
        password: dto.student_password || `${lead.first_name.toLowerCase()}${lead.last_name.toLowerCase()}`,
        center_id: center_id || null,
      });
    }

    const existingRelation = await this.groupStudentModel.findOne({
      where: { group_id: dto.group_id, student_id: student.id },
    });

    if (!existingRelation) {
      await this.groupStudentModel.create({
        group_id: dto.group_id,
        student_id: student.id,
        joined_date: new Date(),
        is_trial: true,
      });
    } else if (!existingRelation.is_trial) {
      throw new BadRequestException('Student allaqachon ushbu guruhga to\'liq a\'zo');
    }

    await lead.update({
      status: LeadStatus.TRIAL_REGISTERED,
      trial_group_id: dto.group_id,
      student_id: student.id,
    });

    return {
      message: 'Probniy darsga muvaffaqiyatli yozildi',
      lead,
      student_id: student.id,
      group_id: dto.group_id,
    };
  }

  async getStats(center_id?: number) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    const total = await this.leadModel.count({ where });
    const byStatus: any = {};
    for (const status of Object.values(LeadStatus)) {
      byStatus[status] = await this.leadModel.count({ where: { ...where, status } });
    }
    return { total, ...byStatus };
  }
}
