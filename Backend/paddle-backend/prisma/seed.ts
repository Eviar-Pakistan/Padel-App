import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL!, // file:./dev.db
  });
  const prisma = new PrismaClient({ adapter });

  const username = 'eviar-admin';
  const plainPassword = 'AccessEviar@123'; // change this

  const existing = await prisma.superAdmin.findUnique({
    where: { username },
  });

  if (existing) {
    console.log('Super admin already exists:', username);
    await prisma.$disconnect();
    return;
  }

  const hash = await bcrypt.hash(plainPassword, 10);

  const admin = await prisma.superAdmin.create({
    data: {
      username,
      password: hash,
      isAdmin: true,
    },
  });

  console.log('Created super admin:', admin.username);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});