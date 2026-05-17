import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { ParentModel } from './entities/parent.entity';
import { ParentStudentModel } from './entities/parent-student.entity';
import { StudentModel } from '../students/model/student.entity';
import { GroupModel } from '../groups/model/group.entity';
import { GroupStudentModel } from '../group_student_model';
import { ChatRoomModel, ChatRoomType } from '../chat/entities/chat-room.entity';
import * as jwt from 'jsonwebtoken';
import { ParentLoginDto, CreateParentDto, LinkStudentDto } from './dto/parent.dto';

@Injectable()
export class ParentService {
  constructor(
    @InjectModel(ParentModel)
    private parentModel: typeof ParentModel,

    @InjectModel(ParentStudentModel)
    private parentStudentModel: typeof ParentStudentModel,

    @InjectModel(StudentModel)
    private studentModel: typeof StudentModel,

    @InjectModel(ChatRoomModel)
    private chatRoomModel: typeof ChatRoomModel,

    @InjectModel(GroupStudentModel)
    private groupStudentModel: typeof GroupStudentModel,
  ) {}

  async login(dto: ParentLoginDto) {
    const parent = await this.parentModel.findOne({
      where: { phone_number: dto.phone_number },
    });

    if (!parent) {
      throw new UnauthorizedException('Telefon raqam yoki parol notogri');
    }

    if (parent.password !== dto.password) {
      throw new UnauthorizedException('Telefon raqam yoki parol notogri');
    }

    const access_token = jwt.sign(
      { sub: parent.id, id: parent.id, type: 'parent', phone_number: parent.phone_number },
      'secret123',
      { expiresIn: '7d' },
    );

    return { access_token, parent: { id: parent.id, first_name: parent.first_name, last_name: parent.last_name, phone_number: parent.phone_number, photo: parent.photo } };
  }

  async findAll(search?: string, center_id?: number) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { phone_number: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const parents = await this.parentModel.findAll({ where, order: [['created_at', 'DESC']] });
    const result = [];
    for (const p of parents) {
      const childrenCount = await this.parentStudentModel.count({ where: { parent_id: p.id } });
      result.push({ ...p.toJSON(), children_count: childrenCount });
    }
    return result;
  }

  async findOne(id: number) {
    const parent = await this.parentModel.findByPk(id);
    if (!parent) throw new NotFoundException('Ota-ona topilmadi');
    const childrenCount = await this.parentStudentModel.count({ where: { parent_id: id } });
    return { ...parent.toJSON(), children_count: childrenCount };
  }

  async create(dto: CreateParentDto) {
    const existing = await this.parentModel.findOne({ where: { phone_number: dto.phone_number } });
    if (existing) throw new ConflictException('Bu telefon raqam bilan ota-ona allaqachon mavjud');

    return this.parentModel.create({ ...dto });
  }

  async getChildren(parentId: number) {
    const parent = await this.parentModel.findByPk(parentId);
    if (!parent) throw new NotFoundException('Ota-ona topilmadi');

    const relations = await this.parentStudentModel.findAll({
      where: { parent_id: parentId },
      include: [
        {
          model: StudentModel,
          as: 'student',
          include: [
            { model: GroupModel, attributes: ['id', 'name'] },
            {
              model: GroupStudentModel,
              as: 'group_students',
              include: [{ model: GroupModel, attributes: ['id', 'name'] }],
            },
          ],
        },
      ],
    });

    return relations.map((r) => r.student).filter(Boolean);
  }

  async linkStudent(parentId: number, dto: LinkStudentDto) {
    const student = await this.studentModel.findByPk(dto.student_id);
    if (!student) throw new NotFoundException('Student topilmadi');

    const existing = await this.parentStudentModel.findOne({
      where: { parent_id: parentId, student_id: dto.student_id },
    });
    if (existing) throw new ConflictException('Bu student allaqachon biriktirilgan');

    const result = await this.parentStudentModel.create({ parent_id: parentId, student_id: dto.student_id });

    // Parent chat xonalarini yaratish
    const groupStudents = await this.groupStudentModel.findAll({
      where: { student_id: dto.student_id },
    });
    for (const gs of groupStudents) {
      await this.chatRoomModel.findOrCreate({
        where: { group_id: gs.group_id, type: ChatRoomType.PARENT },
        defaults: { group_id: gs.group_id, type: ChatRoomType.PARENT },
      });
    }

    return result;
  }

  async unlinkStudent(parentId: number, studentId: number) {
    const rel = await this.parentStudentModel.findOne({
      where: { parent_id: parentId, student_id: studentId },
    });
    if (!rel) throw new NotFoundException('Bog\'lanish topilmadi');
    await rel.destroy();
    return { message: 'Student bilan bog\'lanish olib tashlandi' };
  }
}
