import { Controller,Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll() {
        return this.usersService.findAll();
      }
    }