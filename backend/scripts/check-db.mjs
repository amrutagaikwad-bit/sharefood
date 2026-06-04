import 'dotenv/config';
import { prisma } from '../src/config/prisma.js';

const main = async () => {
  const count = await prisma.user.count();
  console.log('User count:', count);
  const first = await prisma.user.findFirst();
  console.log('First user:', first);
  await prisma.$disconnect();
};

main().catch(async (e) => {
  console.error('DB check failed:', e);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});

