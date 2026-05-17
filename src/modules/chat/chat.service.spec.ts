import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/sequelize";
import { ChatService } from "./chat.service";
import { ChatRoomModel } from "./entities/chat-room.entity";
import { ChatMessageModel } from "./entities/chat-message.entity";
import { MessageStatusModel } from "./entities/message-status.entity";
import { GroupModel } from "../groups/model/group.entity";
import { GroupStudentModel } from "../group_student_model";
import { StudentModel } from "../students/model/student.entity";
import { TeacherModel } from "../teachers/model/teacher.model";
import { ForbiddenException } from "@nestjs/common";

describe("ChatService", () => {
  let service: ChatService;

  const mockChatRoomModel = {
    findOrCreate: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
  };

  const mockChatMessageModel = {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  };

  const mockMessageStatusModel = {
    findOrCreate: jest.fn(),
    count: jest.fn(),
  };

  const mockGroupModel = {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
  };

  const mockGroupStudentModel = {
    findOne: jest.fn(),
    findAll: jest.fn(),
  };

  const mockStudentModel = {
    findByPk: jest.fn(),
  };

  const mockTeacherModel = {
    findByPk: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getModelToken(ChatRoomModel), useValue: mockChatRoomModel },
        {
          provide: getModelToken(ChatMessageModel),
          useValue: mockChatMessageModel,
        },
        {
          provide: getModelToken(MessageStatusModel),
          useValue: mockMessageStatusModel,
        },
        { provide: getModelToken(GroupModel), useValue: mockGroupModel },
        {
          provide: getModelToken(GroupStudentModel),
          useValue: mockGroupStudentModel,
        },
        { provide: getModelToken(StudentModel), useValue: mockStudentModel },
        { provide: getModelToken(TeacherModel), useValue: mockTeacherModel },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getOrCreateRoom", () => {
    it("should create a new room if not exists", async () => {
      const mockRoom = { id: 1, group_id: 1 };
      mockChatRoomModel.findOrCreate.mockResolvedValue([mockRoom]);

      const result = await service.getOrCreateRoom(1);
      expect(result).toEqual(mockRoom);
      expect(mockChatRoomModel.findOrCreate).toHaveBeenCalledWith({
        where: { group_id: 1 },
        defaults: { group_id: 1 },
      });
    });
  });

  describe("canAccessRoom", () => {
    it("should allow admin access to any room", async () => {
      const result = await service.canAccessRoom(1, 1, "admin");
      expect(result).toBe(true);
    });

    it("should allow teacher access to their main groups", async () => {
      mockChatRoomModel.findByPk.mockResolvedValue({ id: 1, group_id: 1 });
      mockTeacherModel.findByPk.mockResolvedValue({
        id: 1,
        mainGroups: [{ id: 1 }],
        supportGroups: [],
      });

      const result = await service.canAccessRoom(1, 1, "teacher");
      expect(result).toBe(true);
    });

    it("should deny teacher access to non-assigned groups", async () => {
      mockChatRoomModel.findByPk.mockResolvedValue({ id: 1, group_id: 999 });
      mockTeacherModel.findByPk.mockResolvedValue({
        id: 1,
        mainGroups: [{ id: 1 }],
        supportGroups: [],
      });

      const result = await service.canAccessRoom(1, 1, "teacher");
      expect(result).toBe(false);
    });

    it("should allow student access to their groups", async () => {
      mockChatRoomModel.findByPk.mockResolvedValue({ id: 1, group_id: 1 });
      mockGroupStudentModel.findOne.mockResolvedValue({
        id: 1,
        group_id: 1,
        student_id: 1,
      });

      const result = await service.canAccessRoom(1, 1, "student");
      expect(result).toBe(true);
    });

    it("should deny student access to non-member groups", async () => {
      mockChatRoomModel.findByPk.mockResolvedValue({ id: 1, group_id: 1 });
      mockGroupStudentModel.findOne.mockResolvedValue(null);

      const result = await service.canAccessRoom(1, 1, "student");
      expect(result).toBe(false);
    });
  });

  describe("createMessage", () => {
    it("should create a message and update room timestamp", async () => {
      mockStudentModel.findByPk.mockResolvedValue({
        id: 1,
        first_name: "Ali",
        last_name: "Valiyev",
        photo: "photo.jpg",
      });

      const mockMessage = {
        toJSON: () => ({
          id: 1,
          room_id: 1,
          sender_id: 1,
          sender_type: "student",
          sender_name: "Ali Valiyev",
          sender_photo: "photo.jpg",
          message_type: "text",
          text: "Salom",
          file_url: null,
          file_name: null,
          file_size: null,
          created_at: new Date(),
        }),
      };

      mockChatMessageModel.create.mockResolvedValue(mockMessage);
      mockChatRoomModel.update.mockResolvedValue([1]);

      const result = await service.createMessage({
        roomId: 1,
        senderId: 1,
        senderType: "student",
        text: "Salom",
      });

      expect(result.text).toBe("Salom");
      expect(result.sender_name).toBe("Ali Valiyev");
      expect(mockChatRoomModel.update).toHaveBeenCalled();
    });
  });

  describe("getMessages", () => {
    it("should throw ForbiddenException if user cannot access room", async () => {
      mockChatRoomModel.findByPk.mockResolvedValue({ id: 1, group_id: 1 });
      mockGroupStudentModel.findOne.mockResolvedValue(null);

      await expect(service.getMessages(1, 999, "student")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should return paginated messages", async () => {
      mockChatRoomModel.findByPk.mockResolvedValue({ id: 1, group_id: 1 });
      mockGroupStudentModel.findOne.mockResolvedValue({
        id: 1,
        group_id: 1,
        student_id: 1,
      });

      const mockMessages = [
        { id: 2, room_id: 1, text: "Message 2", created_at: new Date() },
        {
          id: 1,
          room_id: 1,
          text: "Message 1",
          created_at: new Date("2024-01-01"),
        },
      ];

      mockChatMessageModel.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockMessages,
      });

      const result = await service.getMessages(1, 1, "student");

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe("getUserRooms", () => {
    it("should return rooms for a student", async () => {
      mockGroupStudentModel.findAll.mockResolvedValue([
        { group_id: 1 },
        { group_id: 2 },
      ]);

      const mockRooms = [
        {
          id: 1,
          group_id: 1,
          group: { id: 1, name: "Guruh A" },
          toJSON: () => ({
            id: 1,
            group_id: 1,
            group: { id: 1, name: "Guruh A" },
          }),
        },
        {
          id: 2,
          group_id: 2,
          group: { id: 2, name: "Guruh B" },
          toJSON: () => ({
            id: 2,
            group_id: 2,
            group: { id: 2, name: "Guruh B" },
          }),
        },
      ];

      mockChatRoomModel.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockRooms,
      });

      mockChatMessageModel.findOne.mockResolvedValue(null);

      const result = await service.getUserRooms(1, "student");

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe("getRoomMembers", () => {
    it("should return all members of a room", async () => {
      mockChatRoomModel.findByPk.mockResolvedValue({ id: 1, group_id: 1 });

      mockGroupModel.findByPk.mockResolvedValue({
        id: 1,
        teacher_id: 1,
        support_teacher_id: 2,
        mainTeacher: {
          id: 1,
          first_name: "Main",
          last_name: "Teacher",
          photo: null,
        },
        supportTeacher: {
          id: 2,
          first_name: "Support",
          last_name: "Teacher",
          photo: null,
        },
      });

      mockGroupStudentModel.findAll.mockResolvedValue([
        {
          student: {
            id: 3,
            first_name: "Student",
            last_name: "One",
            photo: null,
          },
        },
        {
          student: {
            id: 4,
            first_name: "Student",
            last_name: "Two",
            photo: null,
          },
        },
      ]);

      const members = await service.getRoomMembers(1);

      expect(members).toContainEqual(
        expect.objectContaining({
          userId: 1,
          userType: "teacher",
          role: "main_teacher",
        }),
      );
      expect(members).toContainEqual(
        expect.objectContaining({
          userId: 2,
          userType: "teacher",
          role: "support_teacher",
        }),
      );
      expect(members).toContainEqual(
        expect.objectContaining({ userId: 3, role: "student" }),
      );
      expect(members).toContainEqual(
        expect.objectContaining({ userId: 4, role: "student" }),
      );
    });
  });
});
