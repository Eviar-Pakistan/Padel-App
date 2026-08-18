import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Roles } from '../auth/roles';
import { MatchesService } from './matches.service';

@WebSocketGateway({
  namespace: '/match-live',
  cors: { origin: '*' },
})
@Injectable()
export class MatchLiveGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly log = new Logger(MatchLiveGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly matches: MatchesService,
  ) {}

  async handleConnection(client: Socket) {
    const token = String(
      client.handshake.auth?.token || client.handshake.query?.token || '',
    );
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync(token);
      client.data.user = payload;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect() {
    return;
  }

  @SubscribeMessage('join')
  handleJoin(client: Socket, body: { matchId?: string }) {
    const matchId = String(body?.matchId || '');
    if (!matchId) return { ok: false };
    client.join(`match:${matchId}`);
    return { ok: true };
  }

  @SubscribeMessage('leave')
  handleLeave(client: Socket, body: { matchId?: string }) {
    const matchId = String(body?.matchId || '');
    if (matchId) client.leave(`match:${matchId}`);
    return { ok: true };
  }

  @SubscribeMessage('score')
  async handleScore(
    client: Socket,
    body: { matchId?: string; kind?: string; team?: number },
  ) {
    const user = client.data.user;
    if (!user || user.role !== Roles.REFEREE) {
      return { ok: false, message: 'Only the referee can score' };
    }
    try {
      const match = await this.matches.recordScore(
        String(user.sub),
        String(body?.matchId || ''),
        {
          kind: (body?.kind || 'POINT') as 'POINT',
          team: body?.team,
        },
      );
      this.emitScore(String(body?.matchId), match);
      return { ok: true, match };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not score';
      this.log.warn(message);
      return { ok: false, message };
    }
  }

  emitScore(matchId: string, payload: unknown) {
    this.server.to(`match:${matchId}`).emit('score', payload);
  }

  emitFinished(matchId: string, payload: unknown) {
    this.server.to(`match:${matchId}`).emit('finished', payload);
  }
}
