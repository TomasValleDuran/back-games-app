import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { LobbyFirestoreService } from './lobby-firestore.service';
import { CreateLobbyDto } from './dto/create-lobby.dto';
import { UpdateGameTypeDto } from './dto/update-game-type.dto';
import { FirebaseAuthGuard } from '@firebase/firebase-auth.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '@firebase/current-user.decorator';

@Controller('lobbies')
@UseGuards(FirebaseAuthGuard)
export class LobbyController {
  constructor(private lobbyFirestoreService: LobbyFirestoreService) {}

  @Post()
  async createLobby(
    @Body() createLobbyDto: CreateLobbyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const existingLobby = await this.lobbyFirestoreService.findUserCurrentLobby(
      user.id,
    );
    if (existingLobby) {
      throw new BadRequestException(
        'You are already in a lobby. Leave it first.',
      );
    }

    const lobby = await this.lobbyFirestoreService.createLobby({
      name: createLobbyDto.name,
      ownerId: user.id,
      ownerUsername: user.username,
      ownerDisplayName: user.displayName || user.username,
      ownerPhotoURL: user.photoURL,
      gameType: createLobbyDto.gameType,
      maxPlayers: createLobbyDto.maxPlayers,
    });

    return {
      success: true,
      lobby,
      message:
        'Lobby created successfully. Listen to Firestore path: /lobbies/' +
        lobby.id,
    };
  }

  @Get()
  async getAvailableLobbies() {
    const lobbies = await this.lobbyFirestoreService.getAvailableLobbies();
    return {
      success: true,
      lobbies,
      count: lobbies.length,
    };
  }

  @Get(':id')
  async getLobby(@Param('id') lobbyId: string) {
    const lobby = await this.lobbyFirestoreService.getLobby(lobbyId);

    if (!lobby) {
      throw new NotFoundException('Lobby not found');
    }

    return {
      success: true,
      lobby,
    };
  }

  @Post(':id/join')
  async joinLobby(
    @Param('id') lobbyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Check if user is already in another lobby
    const existingLobby = await this.lobbyFirestoreService.findUserCurrentLobby(
      user.id,
    );
    if (existingLobby && existingLobby.id !== lobbyId) {
      throw new BadRequestException(
        'You are already in another lobby. Leave it first.',
      );
    }

    await this.lobbyFirestoreService.addPlayerToLobby(lobbyId, {
      userId: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      photoURL: user.photoURL,
    });

    return {
      success: true,
      message:
        'Joined lobby successfully. Listen to Firestore path: /lobbies/' +
        lobbyId,
      lobbyId,
    };
  }

  @Post(':id/leave')
  async leaveLobby(
    @Param('id') lobbyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const lobbyDeleted = await this.lobbyFirestoreService.removePlayerFromLobby(
      lobbyId,
      user.id,
    );

    return {
      success: true,
      lobbyDeleted,
      message: lobbyDeleted ? 'Lobby deleted' : 'Left lobby successfully',
    };
  }

  @Post(':id/ready')
  async toggleReady(
    @Param('id') lobbyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.lobbyFirestoreService.togglePlayerReady(lobbyId, user.id);

    return {
      success: true,
      message: 'Ready status toggled. Check Firestore for updated state.',
    };
  }

  @Get('user/current')
  async getCurrentUserLobby(@CurrentUser() user: AuthenticatedUser) {
    const lobby = await this.lobbyFirestoreService.findUserCurrentLobby(
      user.id,
    );

    if (!lobby) {
      return {
        success: true,
        lobby: null,
        message: 'No active lobby found',
      };
    }

    return {
      success: true,
      lobby,
    };
  }

  @Patch(':id/game-type')
  async updateGameType(
    @Param('id') lobbyId: string,
    @Body() updateGameTypeDto: UpdateGameTypeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const lobby = await this.lobbyFirestoreService.getLobby(lobbyId);

    if (!lobby) {
      throw new NotFoundException('Lobby not found');
    }

    // Check if user is the owner
    if (lobby.ownerId !== user.id) {
      throw new BadRequestException('Only the lobby owner can change the game type');
    }

    const updatedLobby = await this.lobbyFirestoreService.updateLobbyGameType(
      lobbyId,
      updateGameTypeDto.gameType,
    );

    return {
      success: true,
      lobby: updatedLobby,
      message: 'Game type updated successfully. Check Firestore for updated state.',
    };
  }
}
