import 'dotenv/config';
import { prisma } from '../src/config/prisma.js';

console.log('DATABASE_URL (runtime):', process.env.DATABASE_URL);

try {
  const anyPrisma = prisma;
  console.log('prisma created');
} catch (e) {
  console.error('prisma create failed', e);
}

