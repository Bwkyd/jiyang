import { db } from "@/lib/db";
import { collections, samples, settings } from "@/lib/db/schema";
import { eq, and, sql, lt, inArray } from "drizzle-orm";
import { DEFAULT_OVERDUE_DAYS } from "@/constants";

/**
 * 创建催收记录（跟进备注）
 */
export async function createCollection(params: {
  sampleId: number;
  userId: string;
  note?: string;
}) {
  const { sampleId, userId, note } = params;

  // 确认寄样记录存在
  const sample = await db.query.samples.findFirst({
    where: eq(samples.id, sampleId),
  });

  if (!sample) {
    throw new Error("寄样记录不存在");
  }

  // 创建催收/跟进记录
  const [collection] = await db
    .insert(collections)
    .values({
      sampleId,
      userId,
      note: note || null,
    })
    .returning();

  return collection;
}

/**
 * 获取超期样衣列表
 */
export async function getOverdueSamples(userId?: string) {
  // 获取催收阈值
  const setting = await db.query.settings.findFirst({
    where: eq(settings.key, "overdue_days"),
  });
  const overdueDays = setting
    ? parseInt(setting.value, 10)
    : DEFAULT_OVERDUE_DAYS;

  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - overdueDays);

  const conditions = [
    eq(samples.status, "sent"),
    lt(samples.sentAt, overdueDate),
  ];

  if (userId) {
    conditions.push(eq(samples.userId, userId));
  }

  return db.query.samples.findMany({
    where: and(...conditions),
  });
}

/**
 * 获取某条寄样记录的催收历史
 */
export async function getCollectionsBySampleId(sampleId: number) {
  return db.query.collections.findMany({
    where: eq(collections.sampleId, sampleId),
  });
}
