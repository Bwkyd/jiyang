import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function logAudit(params: {
  userId: string;
  action: string;
  targetType: string;
  targetId: string | number;
  detail?: Record<string, unknown>;
}) {
  const { userId, action, targetType, targetId, detail } = params;
  await db.insert(auditLogs).values({
    userId,
    action,
    targetType,
    targetId: String(targetId),
    detail: detail ? JSON.stringify(detail) : null,
  });
}
