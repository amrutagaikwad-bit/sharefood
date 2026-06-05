import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  await prisma.$queryRaw`SELECT 1`;
  const count = await prisma.user.count();
  console.log("Database OK — users:", count);
} catch (err) {
  console.error("Database FAILED:", err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
