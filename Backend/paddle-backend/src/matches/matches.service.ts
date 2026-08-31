import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  BookingStatus,
  ChatMessageType,
  MatchInviteStatus,
  MatchStatus,
  Prisma,
  WeekDay,
} from '../../generated/prisma/client';
import { ChatMediaService } from '../chat/chat-media.service';
import { SendChatMessageDto } from '../chat/dto/send-chat-message.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { SwitchMatchTeamsDto } from './dto/switch-match-teams.dto';
import { MatchScoreActionDto } from './dto/match-score-action.dto';
import {
  applyScoreAction,
  emptyScore,
  parseScore,
  parseScoreLog,
  publicScoreView,
  rankFromPoints,
  winnerFromScore,
  type ScoreKind,
  type ScoreState,
  type TeamIndex,
} from './padel-score';

const WEEK_ORDER: WeekDay[] = [
  WeekDay.MON,
  WeekDay.TUE,
  WeekDay.WED,
  WeekDay.THU,
  WeekDay.FRI,
  WeekDay.SAT,
  WeekDay.SUN,
];

const JS_TO_WEEK: WeekDay[] = [
  WeekDay.SUN,
  WeekDay.MON,
  WeekDay.TUE,
  WeekDay.WED,
  WeekDay.THU,
  WeekDay.FRI,
  WeekDay.SAT,
];

const playerSelect = {
  id: true,
  fullName: true,
  profileImage: true,
  location: true,
  province: true,
} satisfies Prisma.UserSelect;

const refereeSelect = {
  id: true,
  fullName: true,
  profileImage: true,
  location: true,
  province: true,
  hourlyRate: true,
  availableFromDay: true,
  availableToDay: true,
  availableFromTime: true,
  availableToTime: true,
  rating: true,
  totalReviews: true,
} satisfies Prisma.RefereeSelect;

@Injectable()
export class MatchesService implements OnModuleInit, OnModuleDestroy {
  private reminderTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatMedia: ChatMediaService,
  ) {}

  onModuleInit() {
    this.reminderTimer = setInterval(() => {
      this.notifyDueReminders().catch(() => undefined);
      this.settleExpiredMatches().catch(() => undefined);
    }, 30000);
    this.notifyDueReminders().catch(() => undefined);
    this.settleExpiredMatches().catch(() => undefined);
  }

  onModuleDestroy() {
    if (this.reminderTimer) clearInterval(this.reminderTimer);
  }

  private toDateOnly(dateStr: string) {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid bookingDate');
    }
    return date;
  }

  private dateKey(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  private timeToMinutes(hhmm: string) {
    const [h, m = '0'] = String(hhmm || '').split(':');
    return Number(h) * 60 + Number(m);
  }

  /** Inclusive start, exclusive end. Wraps overnight when end is earlier (e.g. 18:00–00:00). */
  private timeInAvailability(
    startMins: number,
    fromStr?: string | null,
    toStr?: string | null,
  ) {
    if (!fromStr || !toStr) return true;
    const from = this.timeToMinutes(fromStr);
    const to = this.timeToMinutes(toStr);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return true;
    if (from === to) return true;
    if (from < to) return startMins >= from && startMins < to;
    return startMins >= from || startMins < to;
  }

  private localDateTime(dateKey: string, hhmm: string) {
    const [y, mo, d] = dateKey.split('-').map(Number);
    const [h, mi = 0] = String(hhmm).split(':').map(Number);
    return new Date(y, mo - 1, d, h, mi, 0, 0);
  }

  private computedStatus(match: {
    status: MatchStatus;
    bookingDate: Date;
    startTime: string;
    endTime: string;
    winnerTeam?: number | null;
    scoreJson?: string | null;
  }) {
    if (match.status === MatchStatus.CANCELLED) return 'CANCELLED';
    if (match.status === MatchStatus.COMPLETED || match.winnerTeam != null) {
      return 'COMPLETED';
    }
    const key = this.dateKey(match.bookingDate);
    const start = this.localDateTime(key, match.startTime);
    let end = this.localDateTime(key, match.endTime);
    if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    const now = Date.now();
    if (now >= start.getTime() && now < end.getTime()) return 'LIVE';
    if (now >= end.getTime()) return 'COMPLETED';
    return 'SCHEDULED';
  }

  private winningParticipants(
    participants: {
      userId: number;
      team: number;
      status: MatchInviteStatus;
    }[],
    winnerTeam: TeamIndex,
  ) {
    return participants.filter(
      (p) =>
        p.status === MatchInviteStatus.ACCEPTED &&
        Number(p.team) === Number(winnerTeam),
    );
  }

  private static readonly PEER_RANK_POINTS: Record<number, number> = {
    1: 10,
    2: 5,
    3: 0,
  };
  private static readonly REFEREE_RANK_POINTS: Record<number, number> = {
    1: 15,
    2: 10,
    3: 5,
    4: 0,
  };
  private static readonly WIN_POINTS = 50;

  /** Mark match finished; points wait until peer + referee rankings are in. */
  private async markMatchFinished(
    tx: Prisma.TransactionClient,
    matchId: string,
    winnerTeam: TeamIndex | null,
    scoreJson?: string | null,
  ) {
    const score = parseScore(scoreJson);
    if (winnerTeam != null) score.winnerTeam = winnerTeam;
    await tx.match.update({
      where: { id: matchId },
      data: {
        winnerTeam,
        status: MatchStatus.COMPLETED,
        scoreJson: JSON.stringify(score),
      },
    });
  }

  private acceptedPlayers(
    participants: { userId: number; team: number; status: MatchInviteStatus }[],
  ) {
    return participants.filter((p) => p.status === MatchInviteStatus.ACCEPTED);
  }

  private async rankingReady(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participants: true,
        peerRankings: true,
        refereeRankings: true,
      },
    });
    if (!match || match.rewardsApplied) return null;
    if (match.status !== MatchStatus.COMPLETED && match.winnerTeam == null) {
      return null;
    }
    const players = this.acceptedPlayers(match.participants);
    if (players.length < 2) return null;

    for (const p of players) {
      const others = players.filter((x) => x.userId !== p.userId).length;
      const given = match.peerRankings.filter((r) => r.raterId === p.userId)
        .length;
      if (given < others) return null;
    }

    const needsReferee =
      Boolean(match.refereeId) &&
      match.refereeInviteStatus === MatchInviteStatus.ACCEPTED;
    if (needsReferee && match.refereeRankings.length < players.length) {
      return null;
    }
    return match;
  }

  /**
   * Final points = (winPoints + refereeRankPoints + peerRankPoints) * 0.5
   * Win team: winPoints=50; lose team: 0.
   */
  private async tryApplyRankingRewards(matchId: string) {
    const match = await this.rankingReady(matchId);
    if (!match) return;

    const players = this.acceptedPlayers(match.participants);
    const winnerTeam =
      match.winnerTeam === 0 || match.winnerTeam === 1
        ? (match.winnerTeam as TeamIndex)
        : null;

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.match.updateMany({
        where: { id: matchId, rewardsApplied: false },
        data: { rewardsApplied: true, status: MatchStatus.COMPLETED },
      });
      if (claimed.count === 0) return;

      for (const p of players) {
        const winPoints =
          winnerTeam != null && Number(p.team) === winnerTeam
            ? MatchesService.WIN_POINTS
            : 0;
        const peerPoints = match.peerRankings
          .filter((r) => r.rankedUserId === p.userId)
          .reduce(
            (sum, r) =>
              sum + (MatchesService.PEER_RANK_POINTS[r.rank] ?? 0),
            0,
          );
        const refRank = match.refereeRankings.find(
          (r) => r.rankedUserId === p.userId,
        );
        const refereePoints = refRank
          ? MatchesService.REFEREE_RANK_POINTS[refRank.rank] ?? 0
          : 0;
        const awarded = Math.round(
          (winPoints + refereePoints + peerPoints) * 0.5,
        );

        await tx.matchParticipant.updateMany({
          where: { matchId, userId: p.userId },
          data: { pointsAwarded: awarded },
        });

        const user = await tx.user.findUnique({
          where: { id: p.userId },
          select: { points: true },
        });
        const points = Number(user?.points || 0) + awarded;
        await tx.user.update({
          where: { id: p.userId },
          data: {
            points,
            ...(winPoints > 0 ? { wins: { increment: 1 } } : {}),
            rank: rankFromPoints(points),
          },
        });
      }
    });
  }

  async settleExpiredMatches() {
    const rows = await this.prisma.match.findMany({
      where: {
        status: { not: MatchStatus.CANCELLED },
        OR: [
          { status: { not: MatchStatus.COMPLETED } },
          { rewardsApplied: false },
        ],
      },
      include: { participants: true },
      take: 80,
    });
    for (const match of rows) {
      const score = parseScore(match.scoreJson);
      const official = winnerFromScore(score, false);
      const expired = this.computedStatus(match) === 'COMPLETED';
      const winner = official ?? (expired ? winnerFromScore(score, true) : null);
      if (!official && !expired) continue;
      if (match.status !== MatchStatus.COMPLETED || match.winnerTeam == null) {
        await this.prisma.$transaction(async (tx) => {
          const fresh = await tx.match.findUnique({ where: { id: match.id } });
          if (!fresh || fresh.status === MatchStatus.CANCELLED) return;
          if (winner == null) {
            await tx.match.update({
              where: { id: match.id },
              data: { status: MatchStatus.COMPLETED },
            });
            return;
          }
          await this.markMatchFinished(
            tx,
            match.id,
            winner,
            fresh.scoreJson,
          );
        });
      }
      await this.tryApplyRankingRewards(match.id);
    }
  }

  private dayInRange(from: WeekDay, to: WeekDay, day: WeekDay) {
    const a = WEEK_ORDER.indexOf(from);
    const b = WEEK_ORDER.indexOf(to);
    const d = WEEK_ORDER.indexOf(day);
    if (a < 0 || b < 0 || d < 0) return true;
    if (a <= b) return d >= a && d <= b;
    return d >= a || d <= b;
  }

  private nextOpenTeam(
    participants: { team: number; status: MatchInviteStatus }[],
  ) {
    const active = participants.filter(
      (p) => p.status !== MatchInviteStatus.REJECTED,
    );
    const team0 = active.filter((p) => Number(p.team) !== 1).length;
    const team1 = active.filter((p) => Number(p.team) === 1).length;
    if (team1 < team0 && team1 < 2) return 1;
    if (team0 < 2) return 0;
    return 1;
  }

  private readonly include = {
    host: { select: playerSelect },
    court: {
      include: {
        paddleOwner: {
          select: { id: true, organizationName: true, location: true },
        },
      },
    },
    referee: { select: refereeSelect },
    participants: {
      include: { user: { select: playerSelect } },
      orderBy: [{ team: 'asc' as const }, { createdAt: 'asc' as const }],
    },
    joinRequests: {
      where: { status: MatchInviteStatus.PENDING },
      include: { user: { select: playerSelect } },
    },
    messages: {
      orderBy: { createdAt: 'desc' as const },
      take: 1,
    },
  };

  private serialize<
    T extends {
      status: MatchStatus;
      bookingDate: Date;
      startTime: string;
      endTime: string;
      winnerTeam?: number | null;
      scoreJson?: string | null;
      participants?: {
        team: number;
        status: MatchInviteStatus;
        user?: { fullName?: string | null } | null;
      }[];
    },
  >(match: T) {
    const { scoreLogJson: _log, ...rest } = match as T & {
      scoreLogJson?: string;
    };
    return {
      ...rest,
      lifecycle: this.computedStatus(match),
      score: this.scoreView(match),
    };
  }

  private teamNames(match: {
    participants?: {
      team: number;
      status: MatchInviteStatus;
      user?: { fullName?: string | null } | null;
    }[];
  }): [string, string] {
    const active = (match.participants || []).filter(
      (p) => p.status !== MatchInviteStatus.REJECTED,
    );
    const label = (team: number) => {
      const names = active
        .filter((p) => (team === 1 ? p.team === 1 : p.team !== 1))
        .map((p) => p.user?.fullName)
        .filter(Boolean);
      return names.length ? names.join(' & ') : team === 0 ? 'Team A' : 'Team B';
    };
    return [label(0), label(1)];
  }

  private scoreView(match: {
    scoreJson?: string | null;
    participants?: {
      team: number;
      status: MatchInviteStatus;
      user?: { fullName?: string | null } | null;
    }[];
  }) {
    return publicScoreView(parseScore(match.scoreJson), this.teamNames(match));
  }

  private async withWatchFlags<T extends { id: string }>(
    userId: number,
    matches: T[],
  ) {
    if (!matches.length) return matches;
    const watches = await this.prisma.matchWatch.findMany({
      where: { userId, matchId: { in: matches.map((m) => m.id) } },
    });
    const map = new Map(watches.map((w) => [w.matchId, w]));
    return matches.map((m) => {
      const w = map.get(m.id);
      return {
        ...m,
        reminded: Boolean(w?.remind),
        onCalendar: Boolean(w?.onCalendar),
      };
    });
  }

  async toggleWatch(
    userId: number,
    matchId: string,
    field: 'remind' | 'onCalendar',
    enabled: boolean,
  ) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Match not found');
    if (match.status === MatchStatus.CANCELLED) {
      throw new BadRequestException('This match was cancelled');
    }
    const existing = await this.prisma.matchWatch.findUnique({
      where: { userId_matchId: { userId, matchId } },
    });
    const remind = field === 'remind' ? enabled : Boolean(existing?.remind);
    const onCalendar =
      field === 'onCalendar' ? enabled : Boolean(existing?.onCalendar);
    if (!remind && !onCalendar) {
      if (existing) {
        await this.prisma.matchWatch.delete({ where: { id: existing.id } });
      }
    } else if (existing) {
      await this.prisma.matchWatch.update({
        where: { id: existing.id },
        data: {
          remind,
          onCalendar,
          ...(field === 'remind' && enabled ? { notifiedAt: null } : {}),
        },
      });
    } else {
      await this.prisma.matchWatch.create({
        data: { userId, matchId, remind, onCalendar },
      });
    }
    return this.findOneForUser(userId, matchId);
  }

  async listCalendarEvents(userId: number) {
    const watches = await this.prisma.matchWatch.findMany({
      where: { userId, onCalendar: true },
      include: { match: { include: this.include } },
      orderBy: { createdAt: 'desc' },
    });
    const matchEvents = watches
      .filter((w) => w.match.status !== MatchStatus.CANCELLED)
      .map((w) => ({ kind: 'match' as const, ...this.serialize(w.match) }));

    // Standalone court bookings (owner or accepted joiner) always appear.
    // Bookings linked to a Match are skipped — those use MatchWatch instead.
    const bookings = await this.prisma.courtBooking.findMany({
      where: {
        status: { not: BookingStatus.CANCELLED },
        match: { is: null },
        OR: [{ userId }, { participants: { some: { userId } } }],
      },
      orderBy: [{ bookingDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        timeSlot: true,
        court: {
          include: {
            paddleOwner: {
              select: {
                id: true,
                organizationName: true,
                location: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profileImage: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const bookingEvents = bookings.map((b) => ({
      kind: 'booking' as const,
      id: b.id,
      bookingDate: b.bookingDate,
      startTime: b.timeSlot.startTime,
      endTime: b.timeSlot.endTime,
      title: `Court booking · ${b.court?.name || 'Court'}`,
      status: b.status,
      isPublic: b.isPublic,
      availableSlots: b.availableSlots,
      court: b.court,
      user: b.user,
      participants: b.participants,
      role: b.userId === userId ? ('owner' as const) : ('participant' as const),
    }));

    return [...matchEvents, ...bookingEvents].sort((a, b) => {
      const da = String(a.bookingDate).slice(0, 10);
      const db = String(b.bookingDate).slice(0, 10);
      if (da !== db) return da.localeCompare(db);
      return String(a.startTime || '').localeCompare(String(b.startTime || ''));
    });
  }

  async notifyDueReminders() {
    const watches = await this.prisma.matchWatch.findMany({
      where: { remind: true, notifiedAt: null },
      include: {
        match: { include: { court: { select: { name: true } } } },
      },
    });
    const now = Date.now();
    for (const watch of watches) {
      const match = watch.match;
      if (match.status === MatchStatus.CANCELLED) continue;
      const lifecycle = this.computedStatus(match);
      if (lifecycle !== 'LIVE') continue;
      const start = this.localDateTime(
        this.dateKey(match.bookingDate),
        match.startTime,
      );
      if (now < start.getTime()) continue;
      await this.prisma.$transaction([
        this.prisma.notification.create({
          data: {
            receiverId: watch.userId,
            senderId: 0,
            type: 'Match Reminder',
            message: `Your reminder: match at ${match.court?.name || 'the court'} is starting now (${match.startTime}).`,
            meta: { action: 'OPEN_MATCH', matchId: match.id },
          },
        }),
        this.prisma.matchWatch.update({
          where: { id: watch.id },
          data: { notifiedAt: new Date() },
        }),
      ]);
    }
  }

  private async assertChatAccess(
    matchId: string,
    auth: { kind: 'user' | 'referee'; id: number | string },
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { participants: true },
    });
    if (!match) throw new NotFoundException('Match not found');
    if (auth.kind === 'referee') {
      if (
        match.refereeId !== String(auth.id) ||
        match.refereeInviteStatus !== MatchInviteStatus.ACCEPTED
      ) {
        throw new ForbiddenException('Not in this match group');
      }
      return match;
    }
    const userId = Number(auth.id);
    const ok = match.participants.some(
      (p) => p.userId === userId && p.status === MatchInviteStatus.ACCEPTED,
    );
    if (!ok) throw new ForbiddenException('Not in this match group');
    return match;
  }

  listPlayers(userId: number) {
    return this.prisma.user.findMany({
      where: { isProfilePublic: true, NOT: { id: userId } },
      select: playerSelect,
      orderBy: [{ points: 'desc' }, { fullName: 'asc' }],
    });
  }

  async listAvailableReferees(courtId: string, dateStr: string, startTime: string) {
    const court = await this.prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new NotFoundException('Court not found');
    const weekday = JS_TO_WEEK[this.localDateTime(dateStr, startTime || '12:00').getDay()];
    const startMins = this.timeToMinutes(startTime);
    const bookingDate = this.toDateOnly(dateStr);

    const referees = await this.prisma.referee.findMany({
      where: {
        status: 'ACTIVE',
        courts: { some: { courtId } },
        matches: {
          none: {
            status: { not: MatchStatus.CANCELLED },
            refereeInviteStatus: {
              in: [MatchInviteStatus.PENDING, MatchInviteStatus.ACCEPTED],
            },
            bookingDate,
            startTime,
          },
        },
      },
      include: {
        courts: { include: { court: { select: { id: true, name: true } } } },
      },
    });

    return referees
      .filter((r) => {
        if (r.availableFromDay && r.availableToDay) {
          if (!this.dayInRange(r.availableFromDay, r.availableToDay, weekday)) {
            return false;
          }
        }
        if (!this.timeInAvailability(startMins, r.availableFromTime, r.availableToTime)) {
          return false;
        }
        return true;
      })
      .map((r) => {
        const { password: _p, ...rest } = r as typeof r & { password?: string };
        return rest;
      });
  }

  async listForUser(userId: number) {
    const rows = await this.prisma.match.findMany({
      where: { status: { not: MatchStatus.CANCELLED } },
      orderBy: [{ bookingDate: 'asc' }, { startTime: 'asc' }],
      include: this.include,
    });
    const upcoming = rows
      .map((m) => this.serialize(m))
      .filter(
        (m) => m.lifecycle === 'SCHEDULED' || m.lifecycle === 'LIVE',
      );
    return this.withWatchFlags(userId, upcoming);
  }

  async listHistoryForUser(userId: number) {
    await this.settleExpiredMatches();
    const rows = await this.prisma.match.findMany({
      where: {
        status: { not: MatchStatus.CANCELLED },
        OR: [
          { hostUserId: userId },
          {
            participants: {
              some: { userId, status: MatchInviteStatus.ACCEPTED },
            },
          },
        ],
      },
      orderBy: [{ bookingDate: 'desc' }, { startTime: 'desc' }],
      include: this.include,
    });
    return rows
      .map((m) => this.serialize(m))
      .filter((m) => m.lifecycle === 'COMPLETED');
  }

  async findOneForUser(userId: number, id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: this.include,
    });
    if (!match) throw new NotFoundException('Match not found');
    const [withFlags] = await this.withWatchFlags(userId, [
      this.serialize(match),
    ]);
    return this.attachRankingFlags(withFlags, { userId });
  }

  async listLive() {
    const rows = await this.prisma.match.findMany({
      where: { status: { not: MatchStatus.CANCELLED } },
      orderBy: [{ bookingDate: 'desc' }, { startTime: 'asc' }],
      include: this.include,
      take: 80,
    });
    return rows
      .map((m) => this.serialize(m))
      .filter((m) => m.lifecycle === 'LIVE');
  }

  async listResults(userId?: number) {
    await this.settleExpiredMatches();
    const rows = await this.prisma.match.findMany({
      where: { status: { not: MatchStatus.CANCELLED } },
      orderBy: [{ bookingDate: 'desc' }, { startTime: 'desc' }],
      include: this.include,
      take: 200,
    });
    const completed = rows
      .map((m) => this.serialize(m))
      .filter((m) => m.lifecycle === 'COMPLETED');
    if (userId == null) return completed;
    return Promise.all(
      completed.map((m) => this.attachRankingFlags(m, { userId })),
    );
  }

  private async attachRankingFlags(
    serialized: any,
    viewer: { userId?: number; refereeId?: string },
  ) {
    const matchId = serialized.id;
    const players = (serialized.participants || []).filter(
      (p) => p.status === MatchInviteStatus.ACCEPTED,
    );
    const isCompleted =
      serialized.lifecycle === 'COMPLETED' ||
      serialized.status === MatchStatus.COMPLETED ||
      serialized.winnerTeam != null;

    let myPeerRanked = false;
    let needsMyPeerRanking = false;
    if (viewer.userId != null && isCompleted) {
      const me = players.find((p) => p.userId === viewer.userId);
      if (me) {
        const others = players.filter((p) => p.userId !== viewer.userId).length;
        const given = await this.prisma.matchPeerRanking.count({
          where: { matchId, raterId: viewer.userId },
        });
        myPeerRanked = others === 0 || given >= others;
        needsMyPeerRanking = others > 0 && given < others;
      }
    }

    let refereeRanked = false;
    let needsRefereeRanking = false;
    const hasReferee =
      Boolean(serialized.refereeId) &&
      serialized.refereeInviteStatus === MatchInviteStatus.ACCEPTED;
    if (hasReferee && isCompleted) {
      const refCount = await this.prisma.matchRefereeRanking.count({
        where: { matchId },
      });
      refereeRanked = refCount >= players.length && players.length > 0;
      if (
        viewer.refereeId &&
        serialized.refereeId === viewer.refereeId
      ) {
        needsRefereeRanking = !refereeRanked;
      }
    }

    let myRefereeReview: {
      rating: number;
      comment: string | null;
      createdAt: Date;
    } | null = null;
    let needsMyRefereeReview = false;
    if (viewer.userId != null && hasReferee && isCompleted) {
      const me = players.find((p) => p.userId === viewer.userId);
      if (me) {
        myRefereeReview = await this.prisma.matchRefereeReview.findUnique({
          where: {
            matchId_userId: { matchId, userId: viewer.userId },
          },
          select: { rating: true, comment: true, createdAt: true },
        });
        // After peer rankings are done, players may review the referee.
        needsMyRefereeReview =
          myPeerRanked && !myRefereeReview && Boolean(serialized.refereeId);
      }
    }

    return {
      ...serialized,
      myPeerRanked,
      needsMyPeerRanking,
      refereeRanked,
      needsRefereeRanking,
      myRefereeReview,
      needsMyRefereeReview,
      rankingsComplete: Boolean(serialized.rewardsApplied),
      rankablePlayers: players.map((p) => ({
        userId: p.userId,
        pointsAwarded: p.pointsAwarded ?? null,
        user: p.user,
      })),
    };
  }

  async getRankingContext(matchId: string, viewer: { userId?: number; refereeId?: string }) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: this.include,
    });
    if (!match) throw new NotFoundException('Match not found');
    const base = this.serialize(match);
    return this.attachRankingFlags(base, viewer);
  }

  async submitPeerRankings(
    userId: number,
    matchId: string,
    rankings: { userId: number; rank: number }[],
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { participants: true },
    });
    if (!match) throw new NotFoundException('Match not found');
    const finished =
      match.status === MatchStatus.COMPLETED || match.winnerTeam != null;
    if (!finished) {
      throw new BadRequestException('Rankings open only after the match ends');
    }
    const players = this.acceptedPlayers(match.participants);
    const me = players.find((p) => p.userId === userId);
    if (!me) {
      throw new ForbiddenException('You are not a player in this match');
    }
    const others = players.filter((p) => p.userId !== userId);
    if (rankings.length !== others.length) {
      throw new BadRequestException(
        `Rank all ${others.length} other players (1 = best)`,
      );
    }
    const ranks = rankings.map((r) => Number(r.rank)).sort((a, b) => a - b);
    const expected = others.map((_, i) => i + 1);
    if (ranks.join(',') !== expected.join(',')) {
      throw new BadRequestException(
        `Use each rank from 1 to ${others.length} exactly once`,
      );
    }
    const otherIds = new Set(others.map((p) => p.userId));
    for (const row of rankings) {
      if (!otherIds.has(Number(row.userId))) {
        throw new BadRequestException('Can only rank other players in this match');
      }
      if (Number(row.userId) === userId) {
        throw new BadRequestException('You cannot rank yourself');
      }
    }

    const existing = await this.prisma.matchPeerRanking.count({
      where: { matchId, raterId: userId },
    });
    if (existing > 0) {
      throw new BadRequestException('You already submitted rankings for this match');
    }

    await this.prisma.matchPeerRanking.createMany({
      data: rankings.map((r) => ({
        matchId,
        raterId: userId,
        rankedUserId: Number(r.userId),
        rank: Number(r.rank),
      })),
    });

    await this.tryApplyRankingRewards(matchId);
    return this.getRankingContext(matchId, { userId });
  }

  private async recalculateRefereeRating(refereeId: string) {
    const agg = await this.prisma.matchRefereeReview.aggregate({
      where: { refereeId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await this.prisma.referee.update({
      where: { id: refereeId },
      data: {
        rating: agg._avg.rating ?? 0,
        totalReviews: agg._count._all,
      },
    });
  }

  async submitRefereeReview(
    userId: number,
    matchId: string,
    dto: { rating: number; comment?: string },
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { participants: true, referee: true },
    });
    if (!match) throw new NotFoundException('Match not found');
    const finished =
      match.status === MatchStatus.COMPLETED || match.winnerTeam != null;
    if (!finished) {
      throw new BadRequestException(
        'Referee reviews open only after the match ends',
      );
    }
    if (
      !match.refereeId ||
      match.refereeInviteStatus !== MatchInviteStatus.ACCEPTED
    ) {
      throw new BadRequestException('This match has no accepted referee');
    }
    const players = this.acceptedPlayers(match.participants);
    if (!players.some((p) => p.userId === userId)) {
      throw new ForbiddenException('Only match players can review the referee');
    }

    const others = players.filter((p) => p.userId !== userId).length;
    const peerGiven = await this.prisma.matchPeerRanking.count({
      where: { matchId, raterId: userId },
    });
    if (others > 0 && peerGiven < others) {
      throw new BadRequestException(
        'Rank other players before reviewing the referee',
      );
    }

    const existing = await this.prisma.matchRefereeReview.findUnique({
      where: { matchId_userId: { matchId, userId } },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this referee');
    }

    const comment = dto.comment?.trim() || undefined;
    const review = await this.prisma.matchRefereeReview.create({
      data: {
        matchId,
        refereeId: match.refereeId,
        userId,
        rating: dto.rating,
        comment,
      },
    });
    await this.recalculateRefereeRating(match.refereeId);
    return {
      ...review,
      referee: match.referee
        ? {
            id: match.referee.id,
            fullName: match.referee.fullName,
            profileImage: match.referee.profileImage,
          }
        : null,
    };
  }

  async submitRefereeRankings(
    refereeId: string,
    matchId: string,
    rankings: { userId: number; rank: number }[],
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { participants: true },
    });
    if (!match) throw new NotFoundException('Match not found');
    if (match.refereeId !== refereeId) {
      throw new ForbiddenException('Only the match referee can rank players');
    }
    if (match.refereeInviteStatus !== MatchInviteStatus.ACCEPTED) {
      throw new ForbiddenException('Accept the match before ranking');
    }
    const finished =
      match.status === MatchStatus.COMPLETED || match.winnerTeam != null;
    if (!finished) {
      throw new BadRequestException('Rankings open only after the match ends');
    }
    const players = this.acceptedPlayers(match.participants);
    if (rankings.length !== players.length) {
      throw new BadRequestException(
        `Rank all ${players.length} players (1 = best)`,
      );
    }
    const ranks = rankings.map((r) => Number(r.rank)).sort((a, b) => a - b);
    const expected = players.map((_, i) => i + 1);
    if (ranks.join(',') !== expected.join(',')) {
      throw new BadRequestException(
        `Use each rank from 1 to ${players.length} exactly once`,
      );
    }
    const playerIds = new Set(players.map((p) => p.userId));
    for (const row of rankings) {
      if (!playerIds.has(Number(row.userId))) {
        throw new BadRequestException('Can only rank players in this match');
      }
    }

    const existing = await this.prisma.matchRefereeRanking.count({
      where: { matchId },
    });
    if (existing > 0) {
      throw new BadRequestException('Referee rankings already submitted');
    }

    await this.prisma.matchRefereeRanking.createMany({
      data: rankings.map((r) => ({
        matchId,
        refereeId,
        rankedUserId: Number(r.userId),
        rank: Number(r.rank),
      })),
    });

    await this.tryApplyRankingRewards(matchId);
    return this.getRankingContext(matchId, { refereeId });
  }

  async findOneForReferee(refereeId: string, id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: this.include,
    });
    if (!match) throw new NotFoundException('Match not found');
    if (match.refereeId !== refereeId) {
      throw new ForbiddenException('This match is not assigned to you');
    }
    if (match.refereeInviteStatus !== MatchInviteStatus.ACCEPTED) {
      throw new ForbiddenException('Accept the match before scoring');
    }
    return this.attachRankingFlags(this.serialize(match), { refereeId });
  }

  async recordScore(
    refereeId: string,
    matchId: string,
    dto: MatchScoreActionDto,
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        ...this.include,
        participants: {
          include: { user: { select: { ...playerSelect, points: true } } },
          orderBy: [{ team: 'asc' as const }, { createdAt: 'asc' as const }],
        },
      },
    });
    if (!match) throw new NotFoundException('Match not found');
    if (match.refereeId !== refereeId) {
      throw new ForbiddenException('Only the assigned referee can score');
    }
    if (match.refereeInviteStatus !== MatchInviteStatus.ACCEPTED) {
      throw new ForbiddenException('Accept the match before scoring');
    }
    if (match.status === MatchStatus.CANCELLED) {
      throw new BadRequestException('This match was cancelled');
    }
    const lifecycle = this.computedStatus(match);
    const current = parseScore(match.scoreJson);
    const endingEarly = dto.kind === 'END';

    if (endingEarly) {
      if (current.winnerTeam != null || match.winnerTeam != null) {
        throw new BadRequestException('This match is already finished');
      }
      if (lifecycle !== 'LIVE' && lifecycle !== 'COMPLETED') {
        throw new BadRequestException(
          'Match can only be ended after it has started.',
        );
      }
    } else if (lifecycle !== 'LIVE') {
      throw new BadRequestException(
        lifecycle === 'COMPLETED'
          ? 'Match time has ended. Scoring is closed.'
          : 'Scoring is only allowed while the match is live.',
      );
    }

    if (current.winnerTeam != null && dto.kind !== 'UNDO') {
      throw new BadRequestException('This match is already finished');
    }

    let next: ScoreState;
    const log = parseScoreLog(match.scoreLogJson);
    if (dto.kind === 'UNDO') {
      const prev = log.pop();
      next = prev || emptyScore();
    } else if (dto.kind === 'END') {
      // Finalize from current sets / games / points lead (same as slot expiry).
      const winner = winnerFromScore(current, true);
      if (winner == null) {
        throw new BadRequestException(
          'Score is completely tied. Award more points before ending the match.',
        );
      }
      log.push(current);
      if (log.length > 200) log.shift();
      next = { ...current, sets: [...(current.sets || [])], winnerTeam: winner };
    } else {
      const team = (dto.team === 1 ? 1 : 0) as TeamIndex;
      if (dto.team !== 0 && dto.team !== 1) {
        throw new BadRequestException('Choose a team');
      }
      log.push(current);
      if (log.length > 200) log.shift();
      next = applyScoreAction(current, dto.kind as ScoreKind, team);
    }

    const finished = next.winnerTeam != null;
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.match.update({
        where: { id: matchId },
        data: {
          scoreJson: JSON.stringify(next),
          scoreLogJson: JSON.stringify(log),
          winnerTeam: next.winnerTeam,
          status: finished ? MatchStatus.COMPLETED : match.status,
        },
      });
      if (finished && next.winnerTeam != null) {
        await this.markMatchFinished(
          tx,
          matchId,
          next.winnerTeam,
          JSON.stringify(next),
        );
      }
      return row;
    });

    if (finished) {
      await this.tryApplyRankingRewards(matchId);
    }

    const fresh = await this.prisma.match.findUnique({
      where: { id: updated.id },
      include: this.include,
    });
    return this.attachRankingFlags(this.serialize(fresh!), {
      refereeId,
    });
  }

  async create(hostUserId: number, dto: CreateMatchDto) {
    const uniqueIds = [...new Set(dto.playerIds.map(Number))].filter(
      (id) => id !== hostUserId,
    );
    if (!uniqueIds.length) {
      throw new BadRequestException('Select at least one other player');
    }
    if (uniqueIds.length > 3) {
      throw new BadRequestException('A match can have at most 4 players');
    }

    const players = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds }, isProfilePublic: true },
      select: { id: true, fullName: true },
    });
    if (players.length !== uniqueIds.length) {
      throw new BadRequestException('One or more players are not available');
    }

    const court = await this.prisma.court.findUnique({
      where: { id: dto.courtId },
      include: { timeSlots: true },
    });
    if (!court?.isActive) throw new BadRequestException('Court is not available');
    const timeSlot = court.timeSlots.find((s) => s.id === dto.timeSlotId);
    if (!timeSlot) {
      throw new BadRequestException('Time slot does not belong to this court');
    }

    const isPublic = Boolean(dto.isPublic);
    const remaining = 4 - 1 - uniqueIds.length;
    let openSlots = 0;
    if (isPublic) {
      openSlots = dto.openSlots ?? remaining;
      if (openSlots < 1 || openSlots > remaining) {
        throw new BadRequestException(
          `Public spots must be between 1 and ${Math.max(remaining, 0)}`,
        );
      }
    }
    if (remaining <= 0 && isPublic) {
      throw new BadRequestException('No open spots left for public join');
    }

    const allocateByOrg = Boolean(dto.allocateRefereeByOrg) && !dto.refereeId;
    if (dto.allocateRefereeByOrg && dto.refereeId) {
      throw new BadRequestException(
        'Choose either a referee or organization allocation, not both',
      );
    }
    if (dto.refereeId) {
      const refs = await this.listAvailableReferees(
        dto.courtId,
        dto.bookingDate,
        timeSlot.startTime,
      );
      if (!refs.some((r) => r.id === dto.refereeId)) {
        throw new BadRequestException('Referee is not available for this court and time');
      }
    }

    const bookingDate = this.toDateOnly(dto.bookingDate);
    const existing = await this.prisma.courtBooking.findUnique({
      where: {
        timeSlotId_bookingDate: { timeSlotId: dto.timeSlotId, bookingDate },
      },
    });
    if (existing && existing.status !== BookingStatus.CANCELLED) {
      throw new ConflictException('This slot is already booked for that date');
    }

    const host = await this.prisma.user.findUnique({
      where: { id: hostUserId },
      select: { id: true, fullName: true },
    });
    const hostName = host?.fullName || 'A player';

    const match = await this.prisma.$transaction(async (tx) => {
      const bookingData = {
        userId: hostUserId,
        status: BookingStatus.CONFIRMED,
        totalPrice: new Prisma.Decimal(court.pricePerHour),
        notes: 'Match booking',
        isPublic: false,
        availableSlots: 0,
      };
      const booking = existing
        ? await tx.courtBooking.update({
            where: { id: existing.id },
            data: bookingData,
          })
        : await tx.courtBooking.create({
            data: {
              courtId: dto.courtId,
              timeSlotId: dto.timeSlotId,
              bookingDate,
              ...bookingData,
            },
          });

      const created = await tx.match.create({
        data: {
          hostUserId,
          courtId: dto.courtId,
          courtBookingId: booking.id,
          bookingDate,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          isPublic,
          openSlots,
          title: dto.title?.trim() || undefined,
          refereeId: dto.refereeId || undefined,
          refereeInviteStatus: dto.refereeId
            ? MatchInviteStatus.PENDING
            : undefined,
          allocateRefereeByOrg: allocateByOrg,
          participants: {
            create: [
              {
                userId: hostUserId,
                isHost: true,
                status: MatchInviteStatus.ACCEPTED,
                team: 0,
              },
              ...uniqueIds.map((userId, index) => ({
                userId,
                isHost: false,
                status: MatchInviteStatus.PENDING,
                team: index < 1 ? 0 : 1,
              })),
            ],
          },
        },
        include: this.include,
      });

      await tx.matchChatMessage.create({
        data: {
          matchId: created.id,
          senderUserId: hostUserId,
          type: ChatMessageType.TEXT,
          text: allocateByOrg
            ? 'Match group created. The club will allocate a referee.'
            : 'Match group created. Players and the referee join after they accept.',
        },
      });

      return created;
    });

    const dateLabel = dto.bookingDate;
    await this.prisma.notification.createMany({
      data: players.map((p) => ({
        receiverId: p.id,
        senderId: hostUserId,
        type: 'Match Invite',
        message: `${hostName} invited you to a match at ${court.name} on ${dateLabel} at ${timeSlot.startTime}.`,
        meta: { action: 'ACCEPT_MATCH', matchId: match.id },
      })),
    });

    return this.serialize(match);
  }

  async acceptInvite(userId: number, matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { participants: true, court: true, host: { select: playerSelect } },
    });
    if (!match) throw new NotFoundException('Match not found');
    const row = match.participants.find((p) => p.userId === userId && !p.isHost);
    if (!row) throw new ForbiddenException('You were not invited to this match');
    if (row.status === MatchInviteStatus.ACCEPTED) return this.findOneForUser(userId, matchId);
    if (row.status === MatchInviteStatus.REJECTED) {
      throw new BadRequestException('This invite was already declined');
    }

    await this.prisma.matchParticipant.update({
      where: { id: row.id },
      data: { status: MatchInviteStatus.ACCEPTED },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    await this.prisma.notification.create({
      data: {
        receiverId: match.hostUserId,
        senderId: userId,
        type: 'Match Update',
        message: `${user?.fullName || 'A player'} accepted your match invite.`,
        meta: { action: 'OPEN_MATCH', matchId },
      },
    });
    await this.prisma.matchChatMessage.create({
      data: {
        matchId,
        senderUserId: userId,
        type: ChatMessageType.TEXT,
        text: `${user?.fullName || 'A player'} joined the match group.`,
      },
    });

    return this.findOneForUser(userId, matchId);
  }

  async rejectInvite(userId: number, matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { participants: true },
    });
    if (!match) throw new NotFoundException('Match not found');
    const row = match.participants.find((p) => p.userId === userId && !p.isHost);
    if (!row) throw new ForbiddenException('You were not invited to this match');
    if (row.status !== MatchInviteStatus.PENDING) {
      throw new BadRequestException('This invite is no longer pending');
    }
    await this.prisma.matchParticipant.update({
      where: { id: row.id },
      data: { status: MatchInviteStatus.REJECTED },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    await this.prisma.notification.create({
      data: {
        receiverId: match.hostUserId,
        senderId: userId,
        type: 'Match Update',
        message: `${user?.fullName || 'A player'} declined your match invite.`,
        meta: { action: 'OPEN_MATCH', matchId },
      },
    });
    return { message: 'Invite declined' };
  }

  async requestJoin(userId: number, matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { participants: true, court: true },
    });
    if (!match) throw new NotFoundException('Match not found');
    if (!match.isPublic || match.openSlots < 1) {
      throw new BadRequestException('This match is not open to join');
    }
    if (match.participants.some((p) => p.userId === userId)) {
      throw new ConflictException('You are already in this match');
    }
    const existing = await this.prisma.matchJoinRequest.findUnique({
      where: { matchId_userId: { matchId, userId } },
    });
    if (existing?.status === MatchInviteStatus.PENDING) {
      throw new ConflictException('Join request already sent');
    }
    if (existing?.status === MatchInviteStatus.ACCEPTED) {
      throw new ConflictException('You already joined this match');
    }

    const request = existing
      ? await this.prisma.matchJoinRequest.update({
          where: { id: existing.id },
          data: { status: MatchInviteStatus.PENDING },
        })
      : await this.prisma.matchJoinRequest.create({
          data: { matchId, userId, status: MatchInviteStatus.PENDING },
        });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    await this.prisma.notification.create({
      data: {
        receiverId: match.hostUserId,
        senderId: userId,
        type: 'Match Join',
        message: `${user?.fullName || 'A player'} wants to join your match at ${match.court.name}.`,
        meta: { action: 'ACCEPT_MATCH_JOIN', matchId, joinRequestId: request.id },
      },
    });
    return { message: 'Join request sent', joinRequest: request };
  }

  async acceptJoin(hostUserId: number, matchId: string, requestId: string) {
    const request = await this.prisma.matchJoinRequest.findUnique({
      where: { id: requestId },
      include: { match: { include: { participants: true } }, user: { select: playerSelect } },
    });
    if (!request || request.matchId !== matchId) {
      throw new NotFoundException('Join request not found');
    }
    if (request.match.hostUserId !== hostUserId) {
      throw new ForbiddenException('Only the match host can accept this request');
    }
    if (request.status !== MatchInviteStatus.PENDING) {
      throw new BadRequestException('This join request is no longer pending');
    }
    if (request.match.openSlots < 1) {
      throw new BadRequestException('No open spots left');
    }

    await this.prisma.$transaction([
      this.prisma.matchJoinRequest.update({
        where: { id: request.id },
        data: { status: MatchInviteStatus.ACCEPTED },
      }),
      this.prisma.matchParticipant.create({
        data: {
          matchId,
          userId: request.userId,
          isHost: false,
          status: MatchInviteStatus.ACCEPTED,
          team: this.nextOpenTeam(request.match.participants),
        },
      }),
      this.prisma.match.update({
        where: { id: matchId },
        data: { openSlots: { decrement: 1 } },
      }),
    ]);

    await this.prisma.notification.create({
      data: {
        receiverId: request.userId,
        senderId: hostUserId,
        type: 'Match Update',
        message: 'Your request to join the match was accepted.',
        meta: { action: 'OPEN_MATCH', matchId },
      },
    });
    await this.prisma.matchChatMessage.create({
      data: {
        matchId,
        senderUserId: request.userId,
        type: ChatMessageType.TEXT,
        text: `${request.user.fullName} joined the match group.`,
      },
    });
    return this.findOneForUser(hostUserId, matchId);
  }

  async switchTeams(
    hostUserId: number,
    matchId: string,
    dto: SwitchMatchTeamsDto,
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { participants: true },
    });
    if (!match) throw new NotFoundException('Match not found');
    if (match.hostUserId !== hostUserId) {
      throw new ForbiddenException('Only the match host can switch teams');
    }
    if (match.status === MatchStatus.CANCELLED) {
      throw new BadRequestException('This match was cancelled');
    }
    const lifecycle = this.computedStatus(match);
    if (lifecycle === 'LIVE') {
      throw new BadRequestException(
        'Teams cannot be switched after the match has started',
      );
    }
    if (lifecycle === 'COMPLETED') {
      throw new BadRequestException('This match has already finished');
    }

    const active = match.participants.filter(
      (p) => p.status !== MatchInviteStatus.REJECTED,
    );
    const player = active.find((p) => p.userId === dto.userId);
    if (!player) {
      throw new BadRequestException('That player is not in this match');
    }

    if (dto.swapWithUserId != null) {
      const other = active.find((p) => p.userId === dto.swapWithUserId);
      if (!other) {
        throw new BadRequestException('That player is not in this match');
      }
      if (player.id === other.id) {
        return this.findOneForUser(hostUserId, matchId);
      }
      await this.prisma.$transaction([
        this.prisma.matchParticipant.update({
          where: { id: player.id },
          data: { team: other.team },
        }),
        this.prisma.matchParticipant.update({
          where: { id: other.id },
          data: { team: player.team },
        }),
      ]);
      return this.findOneForUser(hostUserId, matchId);
    }

    if (dto.team !== 0 && dto.team !== 1) {
      throw new BadRequestException(
        'Choose a team or another player to swap with',
      );
    }
    if (player.team === dto.team) {
      return this.findOneForUser(hostUserId, matchId);
    }
    const destCount = active.filter((p) => p.team === dto.team).length;
    if (destCount >= 2) {
      throw new BadRequestException(
        'That team is full. Tap a player on the other team to swap.',
      );
    }
    await this.prisma.matchParticipant.update({
      where: { id: player.id },
      data: { team: dto.team },
    });
    return this.findOneForUser(hostUserId, matchId);
  }

  async assignReferee(hostUserId: number, matchId: string, refereeId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Match not found');
    if (match.hostUserId !== hostUserId) {
      throw new ForbiddenException('Only the host can assign a referee');
    }
    if (
      match.refereeId &&
      match.refereeInviteStatus === MatchInviteStatus.PENDING
    ) {
      throw new BadRequestException('A referee invite is already pending');
    }
    if (match.refereeInviteStatus === MatchInviteStatus.ACCEPTED) {
      throw new BadRequestException('A referee has already accepted');
    }
    const refs = await this.listAvailableReferees(
      match.courtId,
      this.dateKey(match.bookingDate),
      match.startTime,
    );
    if (!refs.some((r) => r.id === refereeId)) {
      throw new BadRequestException('Referee is not available for this court and time');
    }
    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        refereeId,
        refereeInviteStatus: MatchInviteStatus.PENDING,
        allocateRefereeByOrg: false,
      },
    });
    return this.findOneForUser(hostUserId, matchId);
  }

  async listForOwner(paddleOwnerId: number) {
    await this.settleExpiredMatches();
    const rows = await this.prisma.match.findMany({
      where: {
        court: { paddleOwnerId },
        status: { not: MatchStatus.CANCELLED },
      },
      orderBy: [{ bookingDate: 'desc' }, { startTime: 'desc' }],
      include: this.include,
    });
    return rows.map((m) => {
      const serialized = this.serialize(m);
      const needsReferee =
        !m.refereeId ||
        m.refereeInviteStatus === MatchInviteStatus.REJECTED ||
        (m.allocateRefereeByOrg &&
          m.refereeInviteStatus !== MatchInviteStatus.ACCEPTED);
      return {
        ...serialized,
        needsReferee,
      };
    });
  }

  async allocateRefereeByOwner(
    paddleOwnerId: number,
    matchId: string,
    refereeId: string,
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        court: { select: { id: true, name: true, paddleOwnerId: true } },
      },
    });
    if (!match) throw new NotFoundException('Match not found');
    if (match.court.paddleOwnerId !== paddleOwnerId) {
      throw new ForbiddenException('This match is not on your courts');
    }
    if (match.status === MatchStatus.CANCELLED) {
      throw new BadRequestException('This match was cancelled');
    }
    if (match.refereeInviteStatus === MatchInviteStatus.ACCEPTED) {
      throw new BadRequestException('A referee is already assigned');
    }

    const referee = await this.prisma.referee.findFirst({
      where: {
        id: refereeId,
        status: 'ACTIVE',
        courts: { some: { courtId: match.courtId } },
      },
      select: { id: true, fullName: true },
    });
    if (!referee) {
      throw new BadRequestException(
        'Referee is not linked to this court or is inactive',
      );
    }

    const available = await this.listAvailableReferees(
      match.courtId,
      this.dateKey(match.bookingDate),
      match.startTime,
    );
    if (!available.some((r) => r.id === refereeId)) {
      throw new BadRequestException(
        'Referee is not available for this court and time',
      );
    }

    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        refereeId,
        refereeInviteStatus: MatchInviteStatus.ACCEPTED,
        allocateRefereeByOrg: false,
      },
    });

    const name = referee.fullName || 'The referee';
    await this.prisma.notification.create({
      data: {
        receiverId: match.hostUserId,
        senderId: 0,
        type: 'Match Referee',
        message: `${name} was allocated by the club for your match at ${match.court.name}.`,
        meta: { action: 'OPEN_MATCH', matchId },
      },
    });
    await this.prisma.matchChatMessage.create({
      data: {
        matchId,
        senderRefereeId: refereeId,
        type: ChatMessageType.TEXT,
        text: `${name} was allocated by the club as referee.`,
      },
    });

    const updated = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: this.include,
    });
    return {
      ...this.serialize(updated!),
      needsReferee: false,
    };
  }

  async remove(hostUserId: number, matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        court: { select: { name: true } },
        host: { select: { id: true, fullName: true } },
        participants: { select: { userId: true, isHost: true } },
        joinRequests: {
          where: { status: MatchInviteStatus.PENDING },
          select: { userId: true },
        },
      },
    });
    if (!match) throw new NotFoundException('Match not found');
    if (match.hostUserId !== hostUserId) {
      throw new ForbiddenException('Only the match host can delete this match');
    }

    const hostName = match.host?.fullName || 'The host';
    const courtName = match.court?.name || 'the court';
    const dateLabel = this.dateKey(match.bookingDate);
    const notifyIds = [
      ...new Set(
        [
          ...match.participants
            .filter((p) => !p.isHost && p.userId !== hostUserId)
            .map((p) => p.userId),
          ...match.joinRequests.map((r) => r.userId),
        ].filter((id) => id !== hostUserId),
      ),
    ];

    await this.prisma.$transaction([
      this.prisma.courtBooking.update({
        where: { id: match.courtBookingId },
        data: { status: BookingStatus.CANCELLED },
      }),
      this.prisma.match.delete({ where: { id: matchId } }),
    ]);

    if (notifyIds.length) {
      await this.prisma.notification.createMany({
        data: notifyIds.map((receiverId) => ({
          receiverId,
          senderId: hostUserId,
          type: 'Match Cancelled',
          message: `${hostName} cancelled the match at ${courtName} on ${dateLabel} at ${match.startTime}. The court is available again.`,
        })),
      });
    }

    return { message: 'Match deleted. Court and referee are free.' };
  }

  async listForReferee(refereeId: string) {
    const rows = await this.prisma.match.findMany({
      where: {
        refereeId,
        status: { not: MatchStatus.CANCELLED },
      },
      orderBy: [{ bookingDate: 'asc' }, { startTime: 'asc' }],
      include: this.include,
    });
    return Promise.all(
      rows.map((m) =>
        this.attachRankingFlags(this.serialize(m), { refereeId }),
      ),
    );
  }

  async refereeRespond(refereeId: string, matchId: string, accept: boolean) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { court: true, referee: { select: { fullName: true } } },
    });
    if (!match) throw new NotFoundException('Match not found');
    if (match.refereeId !== refereeId) {
      throw new ForbiddenException('This request is not for you');
    }
    if (match.refereeInviteStatus !== MatchInviteStatus.PENDING) {
      throw new BadRequestException('This request is no longer pending');
    }

    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        refereeInviteStatus: accept
          ? MatchInviteStatus.ACCEPTED
          : MatchInviteStatus.REJECTED,
        ...(accept ? {} : { refereeId: null }),
      },
    });

    const name = match.referee?.fullName || 'The referee';
    await this.prisma.notification.create({
      data: {
        receiverId: match.hostUserId,
        senderId: 0,
        type: 'Match Referee',
        message: accept
          ? `${name} accepted to referee your match at ${match.court.name}.`
          : `${name} declined to referee your match. You can invite another referee.`,
        meta: { action: 'OPEN_MATCH', matchId },
      },
    });
    if (accept) {
      await this.prisma.matchChatMessage.create({
        data: {
          matchId,
          senderRefereeId: refereeId,
          type: ChatMessageType.TEXT,
          text: `${name} joined the match group as referee.`,
        },
      });
    }
    const updated = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: this.include,
    });
    return this.serialize(updated!);
  }

  async listMessages(
    matchId: string,
    auth: { kind: 'user' | 'referee'; id: number | string },
    after?: string,
  ) {
    await this.assertChatAccess(matchId, auth);
    if (auth.kind === 'user' && !after) {
      await this.prisma.matchParticipant.updateMany({
        where: { matchId, userId: Number(auth.id) },
        data: { lastReadAt: new Date() },
      });
    }
    if (auth.kind === 'referee' && !after) {
      await this.prisma.match.update({
        where: { id: matchId },
        data: { refereeLastReadAt: new Date() },
      });
    }
    const afterMsg = after
      ? await this.prisma.matchChatMessage.findUnique({ where: { id: after } })
      : null;
    return this.prisma.matchChatMessage.findMany({
      where: {
        matchId,
        ...(afterMsg ? { createdAt: { gt: afterMsg.createdAt } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: afterMsg ? 100 : 80,
      include: {
        senderUser: { select: playerSelect },
        senderReferee: {
          select: { id: true, fullName: true, profileImage: true },
        },
      },
    });
  }

  async sendMessage(
    matchId: string,
    auth: { kind: 'user' | 'referee'; id: number | string },
    dto: SendChatMessageDto,
    file?: Express.Multer.File,
  ) {
    await this.assertChatAccess(matchId, auth);

    let mediaUrl: string | undefined;
    let fileName: string | undefined;
    let mimeType: string | undefined;
    if (dto.type === ChatMessageType.TEXT) {
      const text = dto.text?.trim();
      if (!text) throw new BadRequestException('Message text is required');
    } else {
      if (!file) {
        throw new BadRequestException('A file is required for this message type');
      }
      const saved = await this.chatMedia.save(file, dto.type);
      mediaUrl = saved.url;
      fileName = saved.fileName;
      mimeType = saved.mimeType;
    }

    return this.prisma.matchChatMessage.create({
      data: {
        matchId,
        senderUserId: auth.kind === 'user' ? Number(auth.id) : undefined,
        senderRefereeId: auth.kind === 'referee' ? String(auth.id) : undefined,
        type: dto.type,
        text: dto.text?.trim() || undefined,
        mediaUrl,
        fileName,
        mimeType,
        durationSec: dto.durationSec,
      },
      include: {
        senderUser: { select: playerSelect },
        senderReferee: {
          select: { id: true, fullName: true, profileImage: true },
        },
      },
    });
  }

  /** Unique list/thread label: "Court D · Ali / Bilal vs Sara / Omar" */
  private chatDisplayTitle(match: {
    title?: string | null;
    court?: { name?: string | null } | null;
    participants?: {
      team: number;
      status: MatchInviteStatus;
      user?: { fullName?: string | null } | null;
    }[];
  }): string {
    const court = match.court?.name || match.title || 'Match';
    const active = (match.participants || []).filter(
      (p) => p.status === MatchInviteStatus.ACCEPTED,
    );
    const label = (team: number) =>
      active
        .filter((p) => (team === 1 ? p.team === 1 : p.team !== 1))
        .map((p) => p.user?.fullName)
        .filter(Boolean)
        .join(' / ');
    const a = label(0);
    const b = label(1);
    if (!a && !b) return match.title || court;
    return `${court} · ${a || 'Team A'} vs ${b || 'Team B'}`;
  }

  async listConversationsForUser(userId: number) {
    const rows = await this.prisma.match.findMany({
      where: {
        status: { not: MatchStatus.CANCELLED },
        participants: {
          some: { userId, status: MatchInviteStatus.ACCEPTED },
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        court: { select: { name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        participants: {
          where: { status: MatchInviteStatus.ACCEPTED },
          include: { user: { select: playerSelect } },
          orderBy: [{ team: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    return Promise.all(
      rows.map(async (m) => {
        const lastReadAt =
          m.participants.find((p) => p.userId === userId)?.lastReadAt ?? null;
        const unreadCount = await this.prisma.matchChatMessage.count({
          where: {
            matchId: m.id,
            NOT: {
              AND: [{ senderUserId: userId }, { senderRefereeId: null }],
            },
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          },
        });
        const displayTitle = this.chatDisplayTitle(m);
        return { ...this.serialize(m), unreadCount, displayTitle };
      }),
    );
  }

  async listConversationsForReferee(refereeId: string) {
    const rows = await this.prisma.match.findMany({
      where: {
        refereeId,
        refereeInviteStatus: MatchInviteStatus.ACCEPTED,
        status: { not: MatchStatus.CANCELLED },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        court: { select: { name: true } },
        host: { select: playerSelect },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        participants: {
          where: { status: MatchInviteStatus.ACCEPTED },
          include: { user: { select: playerSelect } },
          orderBy: [{ team: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    return Promise.all(
      rows.map(async (m) => {
        const unreadCount = await this.prisma.matchChatMessage.count({
          where: {
            matchId: m.id,
            senderUserId: { not: null },
            ...(m.refereeLastReadAt
              ? { createdAt: { gt: m.refereeLastReadAt } }
              : {}),
          },
        });
        const displayTitle = this.chatDisplayTitle(m);
        return { ...this.serialize(m), unreadCount, displayTitle };
      }),
    );
  }
}
