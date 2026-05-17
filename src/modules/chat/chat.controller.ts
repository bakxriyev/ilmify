import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Req,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ChatService } from "./chat.service";
import {
  CreateMessageDto,
  UploadFileDto,
  MarkReadDto,
} from "./dto/create-message.dto";
import { MessageQueryDto, RoomQueryDto } from "./dto/message-query.dto";
import { ChatAuthGuard } from "./chat-auth.guard";
import { v4 as uuid } from "uuid";
import { existsSync, mkdirSync } from "fs";

const chatStorage = diskStorage({
  destination: (req, file, cb) => {
    const folder = "uploads/chat";
    if (!existsSync(folder)) mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const unique = uuid();
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const chatFileFilter = (req: any, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(null, true);
  }
};

@ApiTags("Chat")
@ApiBearerAuth()
@UseGuards(ChatAuthGuard)
@Controller("chat")
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get("rooms")
  @ApiOperation({ summary: "Foydalanuvchining chat xonalari ro'yxati" })
  async getRooms(@Req() req: any, @Query() query: RoomQueryDto) {
    const userId = req.user.id || req.user.sub;
    const userType = req.user.type || "student";
    return this.chatService.getUserRooms(
      userId,
      userType,
      query.page,
      query.limit,
    );
  }

  @Get("rooms/:id")
  @ApiOperation({ summary: "Chat xonasi haqida malumot" })
  async getRoom(@Param("id", ParseIntPipe) id: number) {
    return this.chatService.getRoomById(id);
  }

  @Get("rooms/:id/messages")
  @ApiOperation({ summary: "Xabarlar tarixini olish (paginated)" })
  async getMessages(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Query() query: MessageQueryDto,
  ) {
    const userId = req.user.id || req.user.sub;
    const userType = req.user.type || "student";
    return this.chatService.getMessages(
      id,
      userId,
      userType,
      query.page,
      query.limit,
      query.before_message_id,
    );
  }

  @Get("rooms/:id/members")
  @ApiOperation({ summary: "Chat xonasi a'zolari" })
  async getMembers(@Param("id", ParseIntPipe) id: number) {
    return this.chatService.getRoomMembers(id);
  }

  @Get("rooms/:id/unread")
  @ApiOperation({ summary: "O'qilmagan xabarlar soni" })
  async getUnread(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    const userId = req.user.id || req.user.sub;
    const userType = req.user.type || "student";
    const count = await this.chatService.getUnreadCount(id, userId, userType);
    return { unread_count: count };
  }

  @Post("rooms/:id/messages")
  @ApiOperation({ summary: "Xabar yuborish" })
  async sendMessage(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateMessageDto,
  ) {
    const userId = req.user.id || req.user.sub;
    const userType = req.user.type || "student";

    const message = await this.chatService.createMessage({
      roomId: id,
      senderId: userId,
      senderType: userType,
      text: dto.text,
      messageType: dto.message_type || "text",
    });

    return message;
  }

  @Post("rooms/:id/upload")
  @ApiOperation({ summary: "Fayl yoki rasm yuklash" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: chatStorage,
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: chatFileFilter,
    }),
  )
  async uploadFile(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    const userId = req.user.id || req.user.sub;
    const userType = req.user.type || "student";
    return this.chatService.uploadFile(id, userId, userType, file, dto.text);
  }

  @Post("rooms/:id/read")
  @ApiOperation({ summary: "Xabarlarni o'qilgan deb belgilash" })
  async markRead(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: MarkReadDto,
  ) {
    const userId = req.user.id || req.user.sub;
    const userType = req.user.type || "student";
    await this.chatService.markAsRead(
      id,
      userId,
      userType,
      dto.last_message_id,
    );
    return { success: true };
  }
}
