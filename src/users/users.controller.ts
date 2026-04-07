import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfirmTotpDto } from './dto/confirm-totp.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@UseGuards(RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ─── Profil connecté ──────────────────────────────────────────
  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.usersService.findOne(user.sub);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Post('me/change-password')
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.sub, dto);
  }

  @Roles(Role.ADMIN)
  @Post('me/admin-2fa/setup')
  setupAdmin2fa(@CurrentUser() user: any) {
    return this.usersService.setupAdminTwoFactor(user.sub);
  }

  @Roles(Role.ADMIN)
  @Post('me/admin-2fa/confirm')
  confirmAdmin2fa(@CurrentUser() user: any, @Body() dto: ConfirmTotpDto) {
    return this.usersService.confirmAdminTwoFactor(user.sub, dto.token);
  }

  @Delete('me')
  deleteMe(@CurrentUser() user: any) {
    return this.usersService.remove(user.sub);
  }

  // ─── Admin ────────────────────────────────────────────────────
  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
