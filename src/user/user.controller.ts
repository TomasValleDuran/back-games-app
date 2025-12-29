import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FirebaseAuthGuard } from '@firebase/firebase-auth.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '@firebase/current-user.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @UseGuards(FirebaseAuthGuard)
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Get('all')
  @UseGuards(FirebaseAuthGuard)
  findAll() {
    return this.userService.findAll();
  }

  @Get('email/:email')
  @UseGuards(FirebaseAuthGuard)
  findByEmail(@Param('email') email: string) {
    return this.userService.findByEmail(email);
  }

  @Get('firebase/:firebaseUid')
  @UseGuards(FirebaseAuthGuard)
  findByFirebaseUid(@Param('firebaseUid') firebaseUid: string) {
    return this.userService.findByFirebaseUid(firebaseUid);
  }

  @Get('username/:username')
  @UseGuards(FirebaseAuthGuard)
  findByUsername(@Param('username') username: string) {
    return this.userService.findByUsername(username);
  }

  @Get(':id')
  @UseGuards(FirebaseAuthGuard)
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(FirebaseAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.id !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    if (user.id !== id) {
      throw new ForbiddenException('You can only delete your own account');
    }
    return this.userService.remove(id);
  }
}
