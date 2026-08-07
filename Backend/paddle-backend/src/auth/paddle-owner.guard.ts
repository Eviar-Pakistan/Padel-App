import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Roles } from './roles';

@Injectable()
export class PaddleOwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== Roles.PADDLE_OWNER) {
      throw new ForbiddenException('Paddle owners only');
    }

    return true;
  }
}
