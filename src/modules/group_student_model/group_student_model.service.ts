import { Injectable, NotFoundException, ConflictException,BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { GroupStudentModel } from './model';
import { GroupModel } from 'src/modules/groups';
import { StudentModel } from 'src/modules/students';
import { CreateGroupStudentDto } from './dto';
import { UpdateGroupStudentDto } from './dto';
import { QueryGroupStudentDto } from './dto';
import { Op } from 'sequelize';
import { ChatRoomModel, ChatRoomType } from '../chat/entities/chat-room.entity';

@Injectable()
export class GroupStudentService {
  constructor(
    @InjectModel(GroupStudentModel)
    private readonly groupStudentModel: typeof GroupStudentModel,

    @InjectModel(ChatRoomModel)
    private readonly chatRoomModel: typeof ChatRoomModel,
  ) {}

  async create(createGroupStudentDto: CreateGroupStudentDto): Promise<GroupStudentModel> {
    // Check if student is already in the group
    const existingRelation = await this.groupStudentModel.findOne({
      where: {
        group_id: createGroupStudentDto.group_id,
        student_id: createGroupStudentDto.student_id,
      },
    });

    if (existingRelation) {
      throw new ConflictException('Student is already in this group');
    }

    const joinedDate = createGroupStudentDto.joined_date 
      ? new Date(createGroupStudentDto.joined_date) 
      : new Date();

    const result = await this.groupStudentModel.create({
      ...createGroupStudentDto,
      joined_date: joinedDate,
    });

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
      order: [['joined_date', 'DESC']],
    });

    return {
      data: rows,
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
    return await this.groupStudentModel.findAll({
      where: { group_id: groupId },
      include: [
        { model: StudentModel, as: 'student' },
      ],
      order: [['joined_date', 'ASC']],
    });
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

    // If updating group_id or student_id, check for conflicts
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

      if (existingRelation) {
        throw new ConflictException('Student is already in this group');
      }
    }

    await groupStudent.update(updateGroupStudentDto);
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const groupStudent = await this.findOne(id);
    await groupStudent.destroy();
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

    await groupStudent.destroy();
  }

  async bulkAddStudentsToGroup(
    groupId: number,
    studentIds: number[],
    joined_date?: string, // optional
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
      }
    }

    return results;
  }

  async bulkRemoveStudentsFromGroup(groupId: number, studentIds: number[]): Promise<void> {
    await this.groupStudentModel.destroy({
      where: {
        group_id: groupId,
        student_id: {
          [Op.in]: studentIds,
        },
      },
    });
  }

  async getGroupStats(groupId: number) {
    const totalStudents = await this.groupStudentModel.count({
      where: { group_id: groupId },
    });

    const recentJoins = await this.groupStudentModel.count({
      where: {
        group_id: groupId,
        joined_date: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    return {
      totalStudents,
      recentJoins,
    };
  }
}