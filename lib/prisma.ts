import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set (use PostgreSQL, e.g. Neon, for local and Vercel)");
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function createPrismaClient(): PrismaClient {
  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX ?? 10),
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    });
  globalForPrisma.pgPool = pool;
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
