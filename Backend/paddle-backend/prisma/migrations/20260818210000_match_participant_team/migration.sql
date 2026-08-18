-- AlterTable
ALTER TABLE "MatchParticipant" ADD COLUMN "team" INTEGER NOT NULL DEFAULT 0;

-- Backfill: first two players (by join time) on team 0, the rest on team 1
UPDATE "MatchParticipant"
SET "team" = CASE
  WHEN (
    SELECT COUNT(*)
    FROM "MatchParticipant" AS "earlier"
    WHERE "earlier"."matchId" = "MatchParticipant"."matchId"
      AND "earlier"."status" != 'REJECTED'
      AND (
        "earlier"."createdAt" < "MatchParticipant"."createdAt"
        OR (
          "earlier"."createdAt" = "MatchParticipant"."createdAt"
          AND "earlier"."id" < "MatchParticipant"."id"
        )
      )
  ) >= 2 THEN 1
  ELSE 0
END
WHERE "status" != 'REJECTED';
