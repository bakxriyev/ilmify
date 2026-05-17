import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op, Sequelize } from "sequelize";
import { ChatRoomModel, ChatRoomType } from "./entities/chat-room.entity";
import {
  ChatMessageModel,
  MessageType,
  SenderType,
} from "./entities/chat-message.entity";
import { MessageStatusModel } from "./entities/message-status.entity";
import { GroupModel } from "../groups/model/group.entity";
import { GroupStudentModel } from "../group_student_model";
import { StudentModel } from "../students/model/student.entity";
import { TeacherModel } from "../teachers/model/teacher.model";
import { ParentStudentModel } from "../parents/entities/parent-student.entity";
import { ParentModel } from "../parents/entities/parent.entity";
@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger('ChatService');

  async onModuleInit() {
    try {
      const sequelize = this.chatRoomModel.sequelize;
      if (sequelize) {
        await sequelize.query(
          `ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS "chat_rooms_group_id_key" CASCADE`
        );
        await sequelize.query(
          `ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS "chat_rooms_group_id_type_key" CASCADE`
        );
        this.logger.log('Chat_rooms eski constraintlar tozalandi');
      }
    } catch (err) {
      this.logger.warn('Constraintlarni tozalashda xatolik (non-critical): ' + err.message);
    }
  }

  constructor(
    @InjectModel(ChatRoomModel)
    private chatRoomModel: typeof ChatRoomModel,

    @InjectModel(ChatMessageModel)
    private chatMessageModel: typeof ChatMessageModel,

    @InjectModel(MessageStatusModel)
    private messageStatusModel: typeof MessageStatusModel,

    @InjectModel(GroupModel)
    private groupModel: typeof GroupModel,

    @InjectModel(GroupStudentModel)
    private groupStudentModel: typeof GroupStudentModel,

    @InjectModel(StudentModel)
    private studentModel: typeof StudentModel,

    @InjectModel(TeacherModel)
    private teacherModel: typeof TeacherModel,

    @InjectModel(ParentStudentModel)
    private parentStudentModel: typeof ParentStudentModel,

    @InjectModel(ParentModel)
    private parentModel: typeof ParentModel,
  ) {}

  async getOrCreateRoom(groupId: number, type: ChatRoomType = ChatRoomType.STUDENT): Promise<ChatRoomModel> {
    let room = await this.chatRoomModel.findOne({ where: { group_id: groupId, type } });
    if (!room) {
      try {
        room = await this.chatRoomModel.create({ group_id: groupId, type });
      } catch (err: any) {
        room = await this.chatRoomModel.findOne({ where: { group_id: groupId, type } });
        if (!room) throw err;
      }
    }
    return room;
  }

  async canAccessRoom(
    roomId: number,
    userId: number,
    userType: string,
  ): Promise<boolean> {
    const room = await this.chatRoomModel.findByPk(roomId, {
      include: [{ model: GroupModel, as: "group" }],
    });
    if (!room) return false;

    if (userType === "admin") return true;

    if (userType === "teacher") {
      const teacher = await this.teacherModel.findByPk(userId, {
        include: [
          { model: GroupModel, as: "mainGroups" },
          { model: GroupModel, as: "supportGroups" },
        ],
      });
      if (!teacher) return false;
      const groupIds = [
        ...(teacher.mainGroups || []).map((g) => g.id),
        ...(teacher.supportGroups || []).map((g) => g.id),
      ];
      return groupIds.includes(room.group_id);
    }

    if (userType === "student") {
      if (room.type !== ChatRoomType.STUDENT) return false;
      const rel = await this.groupStudentModel.findOne({
        where: { group_id: room.group_id, student_id: userId },
      });
      return !!rel;
    }

    if (userType === "parent") {
      if (room.type !== ChatRoomType.PARENT) return false;
      const rels = await this.parentStudentModel.findAll({
        where: { parent_id: userId },
      });
      for (const rel of rels) {
        const gs = await this.groupStudentModel.findOne({
          where: { student_id: rel.student_id, group_id: room.group_id },
        });
        if (gs) return true;
      }
      return false;
    }

    return false;
  }

  async getUserRooms(userId: number, userType: string, page = 1, limit = 20) {
    let groupIds: number[] = [];
    let roomType: ChatRoomType = ChatRoomType.STUDENT;

    if (userType === "admin") {
      const groups = await this.groupModel.findAll({ attributes: ["id"] });
      groupIds = groups.map((g) => g.id);
    } else if (userType === "teacher") {
      const teacher = await this.teacherModel.findByPk(userId, {
        include: [
          { model: GroupModel, as: "mainGroups" },
          { model: GroupModel, as: "supportGroups" },
        ],
      });
      if (teacher) {
        groupIds = [
          ...(teacher.mainGroups || []).map((g) => g.id),
          ...(teacher.supportGroups || []).map((g) => g.id),
        ];
      }
    } else if (userType === "student") {
      const rels = await this.groupStudentModel.findAll({
        where: { student_id: userId },
      });
      groupIds = rels.map((r) => r.group_id);
    } else if (userType === "parent") {
      const rels = await this.parentStudentModel.findAll({
        where: { parent_id: userId },
      });
      for (const rel of rels) {
        const studentGroups = await this.groupStudentModel.findAll({
          where: { student_id: rel.student_id },
        });
        for (const sg of studentGroups) {
          if (!groupIds.includes(sg.group_id)) groupIds.push(sg.group_id);
        }
      }
      roomType = ChatRoomType.PARENT;
    }

    if (groupIds.length === 0)
      return { data: [], pagination: { total: 0, page, limit, totalPages: 0 } };

    for (const gid of groupIds) {
      await this.getOrCreateRoom(gid, roomType);
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await this.chatRoomModel.findAndCountAll({
      where: { group_id: { [Op.in]: groupIds }, type: roomType },
      include: [
        {
          model: GroupModel,
          as: "group",
          include: [
            {
              model: TeacherModel,
              as: "mainTeacher",
              attributes: { exclude: ["password"] },
            },
            {
              model: TeacherModel,
              as: "supportTeacher",
              attributes: { exclude: ["password"] },
            },
          ],
        },
      ],
      limit,
      offset,
      order: [["updated_at", "DESC"]],
      distinct: true,
    });

    const roomsWithLastMessage = await Promise.all(
      rows.map(async (room) => {
        const lastMessage = await this.chatMessageModel.findOne({
          where: { room_id: room.id },
          order: [["created_at", "DESC"]],
        });
        return {
          ...room.toJSON(),
          last_message: lastMessage,
        };
      }),
    );

    return {
      data: roomsWithLastMessage,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async getMessages(
    roomId: number,
    userId: number,
    userType: string,
    page = 1,
    limit = 50,
    beforeMessageId?: number,
  ) {
    const canAccess = await this.canAccessRoom(roomId, userId, userType);
    if (!canAccess) throw new ForbiddenException("Ruxsat yoq");

    const where: any = { room_id: roomId };
    if (beforeMessageId) {
      where.id = { [Op.lt]: beforeMessageId };
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await this.chatMessageModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    return {
      data: rows.reverse(),
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async createMessage(data: {
    roomId: number;
    senderId: number;
    senderType: string;
    senderName?: string;
    text?: string;
    messageType?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
  }) {
    let senderName = data.senderName || "";
    let senderPhoto = "";

    if (data.senderType === "student") {
      const student = await this.studentModel.findByPk(data.senderId, {
        attributes: ["first_name", "last_name", "photo"],
      });
      if (student) {
        senderName = `${student.first_name} ${student.last_name}`;
        senderPhoto = student.photo || "";
      }
    } else if (data.senderType === "teacher") {
      const teacher = await this.teacherModel.findByPk(data.senderId, {
        attributes: ["first_name", "last_name", "photo"],
      });
      if (teacher) {
        senderName = `${teacher.first_name} ${teacher.last_name}`;
        senderPhoto = teacher.photo || "";
      }
    } else if (data.senderType === "admin") {
      senderName = senderName || "Admin";
    } else if (data.senderType === "parent") {
      const parent = await this.parentModel.findByPk(data.senderId, {
        attributes: ["first_name", "last_name", "photo"],
      });
      if (parent) {
        senderName = `${parent.first_name} ${parent.last_name}`;
        senderPhoto = parent.photo || "";
      }
    }

    const message = await this.chatMessageModel.create({
      room_id: data.roomId,
      sender_id: data.senderId,
      sender_type: data.senderType,
      sender_name: senderName,
      sender_photo: senderPhoto,
      message_type: data.messageType || MessageType.TEXT,
      text: data.text || null,
      file_url: data.fileUrl || null,
      file_name: data.fileName || null,
      file_size: data.fileSize || null,
    });

    await this.chatRoomModel.update(
      { updated_at: new Date() },
      { where: { id: data.roomId } },
    );

    return message.toJSON();
  }

  async markAsRead(
    roomId: number,
    userId: number,
    userType: string,
    lastMessageId: number,
  ) {
    const messages = await this.chatMessageModel.findAll({
      where: {
        room_id: roomId,
        id: { [Op.lte]: lastMessageId },
        sender_id: { [Op.ne]: userId },
      },
    });

    for (const msg of messages) {
      await this.messageStatusModel.findOrCreate({
        where: {
          message_id: msg.id,
          user_id: userId,
          user_type: userType,
        },
        defaults: {
          message_id: msg.id,
          user_id: userId,
          user_type: userType as SenderType,
          is_read: true,
          read_at: new Date(),
        },
      });
    }
  }

  async getRoomMembers(roomId: number) {
    const room = await this.chatRoomModel.findByPk(roomId, {
      include: [{ model: GroupModel, as: "group" }],
    });
    if (!room) return [];

    const groupId = room.group_id;
    const group = await this.groupModel.findByPk(groupId, {
      include: [
        {
          model: TeacherModel,
          as: "mainTeacher",
          attributes: { exclude: ["password"] },
        },
        {
          model: TeacherModel,
          as: "supportTeacher",
          attributes: { exclude: ["password"] },
        },
      ],
    });
    if (!group) return [];

    const members: any[] = [];

    if (group.mainTeacher) {
      members.push({
        userId: group.mainTeacher.id,
        userType: "teacher",
        userName: `${group.mainTeacher.first_name} ${group.mainTeacher.last_name}`,
        userPhoto: group.mainTeacher.photo,
        role: "main_teacher",
      });
    }

    if (group.supportTeacher && group.supportTeacher.id !== group.teacher_id) {
      members.push({
        userId: group.supportTeacher.id,
        userType: "teacher",
        userName: `${group.supportTeacher.first_name} ${group.supportTeacher.last_name}`,
        userPhoto: group.supportTeacher.photo,
        role: "support_teacher",
      });
    }

    if (room.type === ChatRoomType.PARENT) {
      const parentRels = await this.parentStudentModel.findAll({
        include: [{
          model: StudentModel,
          as: 'student',
          required: true,
          include: [{
            model: GroupStudentModel,
            as: 'group_students',
            where: { group_id: groupId },
          }],
        }],
      });
      for (const rel of parentRels) {
        const parent = await this.parentModel.findByPk(rel.parent_id);
        if (parent) {
          members.push({
            userId: parent.id,
            userType: "parent",
            userName: `${parent.first_name} ${parent.last_name}`,
            userPhoto: parent.photo,
            role: "parent",
          });
        }
      }
    } else {
      const groupStudents = await this.groupStudentModel.findAll({
        where: { group_id: groupId },
        include: [{ model: StudentModel, as: "student" }],
      });
      for (const gs of groupStudents) {
        if (gs.student) {
          members.push({
            userId: gs.student.id,
            userType: "student",
            userName: `${gs.student.first_name} ${gs.student.last_name}`,
            userPhoto: gs.student.photo,
            role: "student",
          });
        }
      }
    }

    return members;
  }

  async uploadFile(
    roomId: number,
    userId: number,
    userType: string,
    file: Express.Multer.File,
    text?: string,
  ) {
    const canAccess = await this.canAccessRoom(roomId, userId, userType);
    if (!canAccess) throw new ForbiddenException("Ruxsat yoq");

    const isImage = file.mimetype.startsWith("image/");
    const messageType = isImage ? MessageType.IMAGE : MessageType.FILE;

    let userName = "";
    if (userType === "student") {
      const s = await this.studentModel.findByPk(userId);
      if (s) userName = `${s.first_name} ${s.last_name}`;
    } else if (userType === "teacher") {
      const t = await this.teacherModel.findByPk(userId);
      if (t) userName = `${t.first_name} ${t.last_name}`;
    } else if (userType === "admin") {
      userName = "Admin";
    }

    return this.createMessage({
      roomId,
      senderId: userId,
      senderType: userType,
      senderName: userName,
      text: text || null,
      messageType,
      fileUrl: file.path || `uploads/chat/${file.filename}`,
      fileName: file.originalname,
      fileSize: file.size,
    });
  }

  async getRoomById(roomId: number) {
    const room = await this.chatRoomModel.findByPk(roomId, {
      include: [
        {
          model: GroupModel,
          as: "group",
          include: [
            {
              model: TeacherModel,
              as: "mainTeacher",
              attributes: { exclude: ["password"] },
            },
            {
              model: TeacherModel,
              as: "supportTeacher",
              attributes: { exclude: ["password"] },
            },
          ],
        },
      ],
    });
    if (!room) throw new NotFoundException("Chat topilmadi");
    return room;
  }

  async getUnreadCount(roomId: number, userId: number, userType: string) {
    const totalMessages = await this.chatMessageModel.count({
      where: { room_id: roomId, sender_id: { [Op.ne]: userId } },
    });

    const readMessages = await this.messageStatusModel.count({
      where: {
        user_id: userId,
        user_type: userType,
        is_read: true,
      },
      include: [
        {
          model: ChatMessageModel,
          as: "message",
          where: { room_id: roomId, sender_id: { [Op.ne]: userId } },
        },
      ],
    });

    return totalMessages - readMessages;
  }
}
