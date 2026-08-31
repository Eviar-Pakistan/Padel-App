/**
 * Reset match scoring / rankings / awarded points so ranking can be tested fresh.
 * Run: npx tsx prisma/clear-match-rewards.ts
 */
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  const delPeer = await prisma.matchPeerRanking.deleteMany({});
  const delRef = await prisma.matchRefereeRanking.deleteMany({});

  const matches = await prisma.match.updateMany({
    data: {
      scoreJson: '{}',
      scoreLogJson: '[]',
      winnerTeam: null,
      rewardsApplied: false,
      status: 'SCHEDULED',
    },
  });

  await prisma.matchParticipant.updateMany({
    data: { pointsAwarded: null },
  });

  const users = await prisma.user.updateMany({
    data: { points: 0, wins: 0, rank: 0 },
  });

  console.log('Cleared peer rankings:', delPeer.count);
  console.log('Cleared referee rankings:', delRef.count);
  console.log('Reset matches:', matches.count);
  console.log('Reset user points/wins/rank:', users.count);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
