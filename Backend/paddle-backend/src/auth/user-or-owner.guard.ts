import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Roles } from './roles';

/** Allows both player users and paddle owners. */
@Injectable()
export class UserOrOwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (
      !user ||
      (user.role !== Roles.USER && user.role !== Roles.PADDLE_OWNER)
    ) {
      throw new ForbiddenException('Users or paddle owners only');
    }

    return true;
  }
}
