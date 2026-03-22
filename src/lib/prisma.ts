import { PrismaClient } from "@prisma/client";
import { withEncryption } from "./prisma-encrypt";

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof withEncryption> };

export const prisma = globalForPrisma.prisma ?? withEncryption(new PrismaClient());
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
