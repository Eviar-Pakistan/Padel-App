import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Roles } from './roles';

/** Allows super_admin or paddle_owner */
@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const allowed = [Roles.SUPER_ADMIN, Roles.PADDLE_OWNER];

    if (!user || !allowed.includes(user.role as (typeof allowed)[number])) {
      throw new ForbiddenException('Staff only');
    }

    return true;
  }
}
