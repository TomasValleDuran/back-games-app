import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './repositories/user.repository';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const emailExists = await this.userRepository.emailExists(
      createUserDto.email,
    );
    if (emailExists) {
      throw new ConflictException('Email already exists');
    }

    const usernameExists = await this.userRepository.usernameExists(
      createUserDto.username,
    );
    if (usernameExists) {
      throw new ConflictException('Username already exists');
    }

    const firebaseUserExists = await this.userRepository.findByFirebaseUid(
      createUserDto.firebaseUid,
    );
    if (firebaseUserExists) {
      throw new ConflictException('User with this Firebase UID already exists');
    }

    return this.userRepository.create(createUserDto);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  async findByFirebaseUid(firebaseUid: string): Promise<User> {
    const user = await this.userRepository.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException(
        `User with Firebase UID ${firebaseUid} not found`,
      );
    }
    return user;
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const userExists = await this.userRepository.exists(id);
    if (!userExists) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (updateUserDto.email) {
      const existingUser = await this.userRepository.findByEmail(
        updateUserDto.email,
      );
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    if (updateUserDto.username) {
      const existingUser = await this.userRepository.findByUsername(
        updateUserDto.username,
      );
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Username already exists');
      }
    }

    return this.userRepository.update(id, updateUserDto);
  }

  async remove(id: string): Promise<User> {
    const userExists = await this.userRepository.exists(id);
    if (!userExists) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.userRepository.remove(id);
  }
}
