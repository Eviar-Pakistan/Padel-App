import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  validate(payload: {
    sub: number | string;
    mobile?: string;
    username?: string;
    email?: string;
    role?: string;
    isAdmin?: boolean;
  }) {
    // This object becomes request.user
    return {
      userId: payload.sub,
      mobile: payload.mobile,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      isAdmin: payload.isAdmin,
    };
  }
}