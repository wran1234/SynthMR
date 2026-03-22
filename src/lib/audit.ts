import { prisma } from "./prisma";
import { logError } from "./logger";

export type AuditAction = "study_create" | "study_delete" | "run_start" | "run_delete";

export async function auditLog(
  userId: string,
  action: AuditAction,
  resourceType: "study" | "run",
  resourceId: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { userId, action, resourceType, resourceId },
    });
  } catch (e) {
    logError("Failed to write audit log", { action, resourceType, resourceId, error: (e as Error).message });
  }
}
