import { PrismaClient } from "@prisma/client";

// En desarrollo Next.js recarga los módulos en caliente; sin este singleton
// cada recarga abriría una nueva pool de conexiones contra Postgres.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
