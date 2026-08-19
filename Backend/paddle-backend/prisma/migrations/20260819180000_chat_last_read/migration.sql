-- AlterTable
ALTER TABLE "ChatGroupMember" ADD COLUMN "lastReadAt" DATETIME;
ALTER TABLE "UserConversation" ADD COLUMN "userLowLastReadAt" DATETIME;
ALTER TABLE "UserConversation" ADD COLUMN "userHighLastReadAt" DATETIME;
ALTER TABLE "MatchParticipant" ADD COLUMN "lastReadAt" DATETIME;
