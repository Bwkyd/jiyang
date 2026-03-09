import { db } from "@/lib/db";
import { samples, talents, products, collections } from "@/lib/db/schema";
import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { STATUS_TRANSITIONS, type SampleStatus } from "@/types";

/**
 * 检查同一达人下同一 SKU 是否已存在未归还的寄样记录
 */
export async function checkDuplicateSample(
  talentId: number,
  skuCode: string
): Promise<boolean> {
  const activeStatuses = ["sent", "collecting", "pending_receipt"];

  const existing = await db.query.samples.findFirst({
    where: and(
      eq(samples.talentId, talentId),
      eq(samples.skuCode, skuCode),
      inArray(samples.status, activeStatuses)
    ),
  });

  return !!existing;
}

/**
 * 批量创建寄样记录
 */
export async function createSamples(params: {
  talentId: number;
  userId: string;
  items: { skuCode: string }[];
  trackingNumber?: string;
}) {
  const { talentId, userId, items, trackingNumber } = params;
  const results = [];

  for (const item of items) {
    // 检查重复
    const isDuplicate = await checkDuplicateSample(talentId, item.skuCode);
    if (isDuplicate) {
      results.push({
        skuCode: item.skuCode,
        success: false,
        error: "该样衣已在该达人处，无需重复寄出",
      });
      continue;
    }

    const [sample] = await db
      .insert(samples)
      .values({
        talentId,
        skuCode: item.skuCode,
        userId,
        status: "sent",
        trackingNumber: trackingNumber || null,
        sentAt: new Date(),
      })
      .returning();

    results.push({ skuCode: item.skuCode, success: true, sample });
  }

  return results;
}

/**
 * 更新寄样状态（严格遵循状态流转规则）
 */
export async function updateSampleStatus(params: {
  sampleId: number;
  userId: string;
  newStatus: SampleStatus;
  abnormalNote?: string;
  returnTrackingNumber?: string;
}) {
  const { sampleId, userId, newStatus, abnormalNote, returnTrackingNumber } =
    params;

  const sample = await db.query.samples.findFirst({
    where: eq(samples.id, sampleId),
  });

  if (!sample) {
    throw new Error("寄样记录不存在");
  }

  // 校验状态流转
  const currentStatus = sample.status as SampleStatus;
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];

  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(
      `不允许从"${currentStatus}"变更为"${newStatus}"状态`
    );
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date(),
  };

  if (newStatus === "returned") {
    updateData.returnedAt = new Date();
  }

  if (newStatus === "abnormal" && abnormalNote) {
    updateData.abnormalNote = abnormalNote;
  }

  if (returnTrackingNumber) {
    updateData.returnTrackingNumber = returnTrackingNumber;
  }

  const [updated] = await db
    .update(samples)
    .set(updateData)
    .where(eq(samples.id, sampleId))
    .returning();

  return updated;
}

/**
 * 查询寄样记录（支持筛选）
 */
export async function getSamples(params: {
  userId?: string; // 商务过滤（admin 不传则查全部）
  talentId?: number;
  status?: string;
  trackingNumber?: string;
  page?: number;
  pageSize?: number;
}) {
  const { userId, talentId, status, trackingNumber, page = 1, pageSize = 20 } = params;

  const conditions = [];
  if (userId) conditions.push(eq(samples.userId, userId));
  if (talentId) conditions.push(eq(samples.talentId, talentId));
  if (status) conditions.push(eq(samples.status, status));
  if (trackingNumber) {
    conditions.push(sql`samples.tracking_number ILIKE ${`%${trackingNumber}%`}`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // 获取样衣数据（带达人信息）
  const data = await db
    .select({
      id: samples.id,
      talentId: samples.talentId,
      skuCode: samples.skuCode,
      status: samples.status,
      trackingNumber: samples.trackingNumber,
      returnTrackingNumber: samples.returnTrackingNumber,
      sentAt: samples.sentAt,
      returnedAt: samples.returnedAt,
      abnormalNote: samples.abnormalNote,
      createdAt: samples.createdAt,
      updatedAt: samples.updatedAt,
      // 达人信息
      talentName: talents.name,
    })
    .from(samples)
    .leftJoin(talents, eq(samples.talentId, talents.id))
    .where(where)
    .orderBy(desc(samples.sentAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  // 获取每条记录的催收/跟进次数
  const sampleIds = data.map((s) => s.id);
  const collectionCounts = await db
    .select({
      sampleId: collections.sampleId,
      count: sql<number>`count(*)`,
    })
    .from(collections)
    .where(inArray(collections.sampleId, sampleIds))
    .groupBy(collections.sampleId);

  const countMap = new Map(collectionCounts.map((c) => [c.sampleId, Number(c.count)]));

  const dataWithCounts = data.map((s) => ({
    ...s,
    collectionCount: countMap.get(s.id) || 0,
  }));

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(samples)
    .where(where);

  return {
    data: dataWithCounts,
    total: Number(countResult.count),
    page,
    pageSize,
  };
}

/**
 * 获取寄样状态统计
 */
export async function getSampleStats(userId?: string) {
  const condition = userId ? eq(samples.userId, userId) : undefined;

  const stats = await db
    .select({
      status: samples.status,
      count: sql<number>`count(*)`,
    })
    .from(samples)
    .where(condition)
    .groupBy(samples.status);

  return stats.reduce(
    (acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    },
    {} as Record<string, number>
  );
}
