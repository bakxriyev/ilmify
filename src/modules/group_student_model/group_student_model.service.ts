import { Injectable, NotFoundException, ConflictException,BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { GroupStudentModel } from './model/group_student_model.entity';
import { GroupModel } from '../groups/model/group.entity';
import { StudentModel } from '../students/model/student.entity';
import { LevelModel } from '../level/model/level.entity';
import { ParentStudentModel } from '../parents/entities/parent-student.entity';
import { ParentModel } from '../parents/entities/parent.entity';
import { CreateGroupStudentDto } from './dto';
import { UpdateGroupStudentDto } from './dto';
import { QueryGroupStudentDto } from './dto';
import { Op } from 'sequelize';
import { ChatRoomModel, ChatRoomType } from '../chat/entities/chat-room.entity';

@Injectable()
export class GroupStudentService {
  private get studentModel(): typeof StudentModel {
    return this.sequelize.model('StudentModel') as typeof StudentModel;
  }

  constructor(
    @InjectModel(GroupStudentModel)
    private readonly groupStudentModel: typeof GroupStudentModel,

    @InjectModel(ChatRoomModel)
    private readonly chatRoomModel: typeof ChatRoomModel,

    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  async create(createGroupStudentDto: CreateGroupStudentDto): Promise<GroupStudentModel> {
    const existingRelation = await this.groupStudentModel.findOne({
      where: {
        group_id: createGroupStudentDto.group_id,
        student_id: createGroupStudentDto.student_id,
      },
    });

    if (existingRelation) {
      if (!existingRelation.left_date) {
        throw new ConflictException('Student is already in this group');
      }
      const joinedDate = createGroupStudentDto.joined_date
        ? new Date(createGroupStudentDto.joined_date)
        : new Date();
      await existingRelation.update({ joined_date: joinedDate, left_date: null });
      await this.studentModel.update({ group_id: createGroupStudentDto.group_id }, { where: { id: createGroupStudentDto.student_id } });
      return this.findOne(existingRelation.id);
    }

    const joinedDate = createGroupStudentDto.joined_date
      ? new Date(createGroupStudentDto.joined_date)
      : new Date();

    const result = await this.groupStudentModel.create({
      ...createGroupStudentDto,
      joined_date: joinedDate,
    });

    await this.studentModel.update({ group_id: createGroupStudentDto.group_id }, { where: { id: createGroupStudentDto.student_id } });

    for (const type of [ChatRoomType.STUDENT, ChatRoomType.PARENT]) {
      await this.chatRoomModel.findOrCreate({
        where: { group_id: createGroupStudentDto.group_id, type },
        defaults: { group_id: createGroupStudentDto.group_id, type },
      });
    }

    return result;
  }

  async findAll(queryDto: QueryGroupStudentDto) {
    const { page, limit, group_id, student_id, student_name, group_name } = queryDto;
    const offset = (page - 1) * limit;

    const whereClause: any = {};
    const includeWhere: any = {};

    if (group_id) {
      whereClause.group_id = group_id;
    }

    if (student_id) {
      whereClause.student_id = student_id;
    }

    const include = [
      {
        model: GroupModel,
        as: 'group',
        where: group_name ? { name: { [Op.iLike]: `%${group_name}%` } } : undefined,
      },
      {
        model: StudentModel,
        as: 'student',
        where: student_name ? { 
          [Op.or]: [
            { first_name: { [Op.iLike]: `%${student_name}%` } },
            { last_name: { [Op.iLike]: `%${student_name}%` } },
          ]
        } : undefined,
      },
    ];

    const { count, rows } = await this.groupStudentModel.findAndCountAll({
      where: whereClause,
      include,
      limit,
      offset,
      order: [
        [{ model: StudentModel, as: 'student' }, 'first_name', 'ASC'],
      ],
    });

    const active = rows.filter(r => !r.left_date);
    const removed = rows.filter(r => r.left_date).sort((a, b) => new Date(b.left_date).getTime() - new Date(a.left_date).getTime());

    return {
      data: [...active, ...removed],
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async findOne(id: number): Promise<GroupStudentModel> {
    const groupStudent = await this.groupStudentModel.findByPk(id, {
      include: [
        { model: GroupModel, as: 'group' },
        { model: StudentModel, as: 'student' },
      ],
    });

    if (!groupStudent) {
      throw new NotFoundException(`GroupStudent with ID ${id} not found`);
    }

    return groupStudent;
  }

  async findByGroupId(groupId: number): Promise<GroupStudentModel[]> {
    const rows = await this.groupStudentModel.findAll({
      where: { group_id: groupId },
      include: [
        {
          model: StudentModel,
          as: 'student',
          include: [{
            model: ParentStudentModel,
            as: 'parent_links',
            required: false,
            include: [{
              model: ParentModel,
              as: 'parent',
              attributes: ['id', 'first_name', 'last_name', 'phone_number'],
            }],
          }],
        },
      ],
      order: [['joined_date', 'ASC']],
    });

    const active = rows.filter(r => !r.left_date);
    const removed = rows.filter(r => r.left_date).sort((a, b) => new Date(b.left_date).getTime() - new Date(a.left_date).getTime());

    return [...active, ...removed];
  }

  async findByStudentId(studentId: number): Promise<GroupStudentModel[]> {
    return await this.groupStudentModel.findAll({
      where: { student_id: studentId },
      include: [
        { model: GroupModel, as: 'group' },
      ],
      order: [['joined_date', 'DESC']],
    });
  }

  async update(id: number, updateGroupStudentDto: UpdateGroupStudentDto): Promise<GroupStudentModel> {
    const groupStudent = await this.findOne(id);

    if (updateGroupStudentDto.group_id || updateGroupStudentDto.student_id) {
      const newGroupId = updateGroupStudentDto.group_id || groupStudent.group_id;
      const newStudentId = updateGroupStudentDto.student_id || groupStudent.student_id;

      const existingRelation = await this.groupStudentModel.findOne({
        where: {
          group_id: newGroupId,
          student_id: newStudentId,
          id: { [Op.ne]: id },
        },
      });

      if (existingRelation && !existingRelation.left_date) {
        throw new ConflictException('Student is already in this group');
      }
    }

    await groupStudent.update(updateGroupStudentDto);
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const groupStudent = await this.findOne(id);
    await groupStudent.update({ left_date: new Date() });
  }

  async removeByGroupAndStudent(groupId: number, studentId: number): Promise<void> {
    const groupStudent = await this.groupStudentModel.findOne({
      where: {
        group_id: groupId,
        student_id: studentId,
      },
    });

    if (!groupStudent) {
      throw new NotFoundException('GroupStudent relation not found');
    }

    await groupStudent.update({ left_date: new Date() });
    await this.studentModel.update({ group_id: null }, { where: { id: studentId } });
  }

  async bulkAddStudentsToGroup(
    groupId: number,
    studentIds: number[],
    joined_date?: string,
  ) {
    if (!studentIds || studentIds.length === 0) {
      throw new BadRequestException('studentIds array is required');
    }
    const joinDate = joined_date ? new Date(joined_date) : new Date();
    const results = [];

    for (const studentId of studentIds) {
      const existing = await this.groupStudentModel.findOne({
        where: {
          group_id: groupId,
          student_id: studentId,
        },
      });

      if (!existing) {
        const created = await this.groupStudentModel.create({
          group_id: groupId,
          student_id: studentId,
          joined_date: joinDate,
        });
        results.push(created);
      } else if (existing.left_date) {
        await existing.update({ joined_date: joinDate, left_date: null });
        results.push(existing);
      }

      // Studentning group_id sini ham yangilaymiz
      await this.studentModel.update({ group_id: groupId }, { where: { id: studentId } });
    }

    return results;
  }

  async bulkRemoveStudentsFromGroup(groupId: number, studentIds: number[]): Promise<void> {
    await this.groupStudentModel.update(
      { left_date: new Date() },
      {
        where: {
          group_id: groupId,
          student_id: { [Op.in]: studentIds },
          left_date: null,
        },
      },
    );

    // Studentning group_id sini tozalaymiz
    await this.studentModel.update(
      { group_id: null },
      { where: { id: { [Op.in]: studentIds } } },
    );
  }

  async findAllTrial() {
    return this.groupStudentModel.findAll({
      where: { is_trial: true, left_date: null },
      include: [
        { model: GroupModel, as: 'group', include: [{ model: LevelModel, as: 'level' }] },
        { model: StudentModel, as: 'student' },
      ],
      order: [['joined_date', 'DESC']],
    });
  }

  async confirmTrial(id: number) {
    const relation = await this.findOne(id);
    await relation.update({ is_trial: false, left_date: null });
    return { message: 'Student to\'liq a\'zoga aylandi', data: await this.findOne(id) };
  }

  async getGroupStats(groupId: number) {
    const totalStudents = await this.groupStudentModel.count({
      where: { group_id: groupId, left_date: null },
    });

    const recentJoins = await this.groupStudentModel.count({
      where: {
        group_id: groupId,
        left_date: null,
        joined_date: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return {
      totalStudents,
      recentJoins,
    };
  }
}
