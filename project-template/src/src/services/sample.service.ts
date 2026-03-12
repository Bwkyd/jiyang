import { db } from "@/lib/db";
import { samples, talents, collections } from "@/lib/db/schema";
import { eq, and, or, inArray, sql, desc, ilike, isNull, isNotNull } from "drizzle-orm";
import type { SampleStatus } from "@/types";
import { logAudit } from "./audit.service";

/**
 * 检查同一达人下同一 SKU 是否已存在未归还的寄样记录
 */
export async function checkDuplicateSample(
  talentId: number,
  skuCode: string
): Promise<boolean> {
  const existing = await db.query.samples.findFirst({
    where: and(
      eq(samples.talentId, talentId),
      eq(samples.skuCode, skuCode),
      eq(samples.status, "sent")
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

    await logAudit({
      userId,
      action: "sample.create",
      targetType: "sample",
      targetId: sample.id,
      detail: { skuCode: item.skuCode, talentId, trackingNumber },
    });

    results.push({ skuCode: item.skuCode, success: true, sample });
  }

  return results;
}

/**
 * 更新寄样状态（sent → returned）
 */
export async function updateSampleStatus(params: {
  sampleId: number;
  userId: string;
  newStatus: SampleStatus;
  returnTrackingNumber?: string;
}) {
  const { sampleId, userId, newStatus, returnTrackingNumber } = params;

  const sample = await db.query.samples.findFirst({
    where: eq(samples.id, sampleId),
  });

  if (!sample) {
    throw new Error("寄样记录不存在");
  }

  const currentStatus = sample.status;

  if (newStatus === "returned" && currentStatus !== "sent") {
    throw new Error("只有已寄出的样衣才能确认归还");
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date(),
  };

  if (newStatus === "returned") {
    updateData.returnedAt = new Date();
  }

  if (returnTrackingNumber !== undefined) {
    updateData.returnTrackingNumber = returnTrackingNumber || null;
  }

  const [updated] = await db
    .update(samples)
    .set(updateData)
    .where(eq(samples.id, sampleId))
    .returning();

  await logAudit({
    userId,
    action: "sample.status_change",
    targetType: "sample",
    targetId: sampleId,
    detail: {
      from: currentStatus,
      to: newStatus,
      returnTrackingNumber,
    },
  });

  return updated;
}

/**
 * 更新寄样标记（异常备注、回寄单号/待收货）
 */
export async function updateSampleTags(params: {
  sampleId: number;
  userId: string;
  abnormalNote?: string | null;
  returnTrackingNumber?: string | null;
}) {
  const { sampleId, userId, abnormalNote, returnTrackingNumber } = params;

  const sample = await db.query.samples.findFirst({
    where: eq(samples.id, sampleId),
  });

  if (!sample) {
    throw new Error("寄样记录不存在");
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (abnormalNote !== undefined) {
    updateData.abnormalNote = abnormalNote;
  }

  if (returnTrackingNumber !== undefined) {
    updateData.returnTrackingNumber = returnTrackingNumber;
  }

  const [updated] = await db
    .update(samples)
    .set(updateData)
    .where(eq(samples.id, sampleId))
    .returning();

  await logAudit({
    userId,
    action: "sample.tags_update",
    targetType: "sample",
    targetId: sampleId,
    detail: { abnormalNote, returnTrackingNumber },
  });

  return updated;
}

/**
 * 查询寄样记录（支持筛选）
 * filter 支持: sent, returned, pending_receipt(待收货标记), abnormal(异常标记)
 */
export async function getSamples(params: {
  userId?: string;
  talentId?: number;
  status?: string;
  trackingNumber?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}) {
  const { userId, talentId, status, trackingNumber, keyword, page = 1, pageSize = 20 } = params;

  const conditions = [];
  if (userId) conditions.push(eq(samples.userId, userId));
  if (talentId) conditions.push(eq(samples.talentId, talentId));

  // 筛选：真实状态 or 标记
  if (status === "sent") {
    conditions.push(eq(samples.status, "sent"));
  } else if (status === "returned") {
    conditions.push(eq(samples.status, "returned"));
  } else if (status === "pending_receipt") {
    // 待收货标记：已寄出 + 有回寄单号
    conditions.push(eq(samples.status, "sent"));
    conditions.push(isNotNull(samples.returnTrackingNumber));
  } else if (status === "abnormal") {
    // 异常标记：有异常备注
    conditions.push(isNotNull(samples.abnormalNote));
  }

  if (trackingNumber) {
    conditions.push(sql`samples.tracking_number ILIKE ${`%${trackingNumber}%`}`);
  }
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        ilike(samples.skuCode, pattern),
        ilike(samples.trackingNumber, pattern),
        ilike(talents.name, pattern)
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

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
      talentName: talents.name,
    })
    .from(samples)
    .leftJoin(talents, eq(samples.talentId, talents.id))
    .where(where)
    .orderBy(desc(samples.sentAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const sampleIds = data.map((s) => s.id);
  let countMap = new Map<number, number>();
  if (sampleIds.length > 0) {
    const collectionCounts = await db
      .select({
        sampleId: collections.sampleId,
        count: sql<number>`count(*)`,
      })
      .from(collections)
      .where(inArray(collections.sampleId, sampleIds))
      .groupBy(collections.sampleId);

    countMap = new Map(collectionCounts.map((c) => [c.sampleId, Number(c.count)]));
  }

  const dataWithCounts = data.map((s) => ({
    ...s,
    collectionCount: countMap.get(s.id) || 0,
  }));

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(samples)
    .leftJoin(talents, eq(samples.talentId, talents.id))
    .where(where);

  return {
    data: dataWithCounts,
    total: Number(countResult.count),
    page,
    pageSize,
  };
}

/**
 * 批量确认归还
 */
export async function batchUpdateSampleStatus(params: {
  sampleIds: number[];
  userId: string;
  newStatus: SampleStatus;
  returnTrackingNumber?: string;
}) {
  const { sampleIds, userId, newStatus, returnTrackingNumber } = params;
  const results: { id: number; success: boolean; error?: string }[] = [];

  for (const sampleId of sampleIds) {
    try {
      await updateSampleStatus({
        sampleId,
        userId,
        newStatus,
        returnTrackingNumber,
      });
      results.push({ id: sampleId, success: true });
    } catch (error) {
      results.push({
        id: sampleId,
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
      });
    }
  }

  return results;
}

/**
 * 导出寄样记录为 CSV
 */
export async function exportSamplesCSV(params: {
  userId?: string;
  talentId?: number;
  status?: string;
  keyword?: string;
}) {
  const { userId, talentId, status, keyword } = params;

  const conditions = [];
  if (userId) conditions.push(eq(samples.userId, userId));
  if (talentId) conditions.push(eq(samples.talentId, talentId));
  if (status === "sent" || status === "returned") {
    conditions.push(eq(samples.status, status));
  } else if (status === "pending_receipt") {
    conditions.push(eq(samples.status, "sent"));
    conditions.push(isNotNull(samples.returnTrackingNumber));
  } else if (status === "abnormal") {
    conditions.push(isNotNull(samples.abnormalNote));
  }
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        ilike(samples.skuCode, pattern),
        ilike(samples.trackingNumber, pattern),
        ilike(talents.name, pattern)
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db
    .select({
      id: samples.id,
      skuCode: samples.skuCode,
      talentName: talents.name,
      status: samples.status,
      trackingNumber: samples.trackingNumber,
      returnTrackingNumber: samples.returnTrackingNumber,
      sentAt: samples.sentAt,
      returnedAt: samples.returnedAt,
      abnormalNote: samples.abnormalNote,
    })
    .from(samples)
    .leftJoin(talents, eq(samples.talentId, talents.id))
    .where(where)
    .orderBy(desc(samples.sentAt));

  const header = "ID,SKU,达人,状态,标记,快递单号,回寄单号,寄出时间,归还时间,异常备注";
  const rows = data.map((s) => {
    const tags = [];
    if (s.status === "sent" && s.returnTrackingNumber) tags.push("待收货");
    if (s.abnormalNote) tags.push("异常");
    return [
      s.id,
      s.skuCode,
      s.talentName || "",
      s.status === "sent" ? "已寄出" : "已归还",
      tags.join("/"),
      s.trackingNumber || "",
      s.returnTrackingNumber || "",
      s.sentAt ? new Date(s.sentAt).toLocaleDateString("zh-CN") : "",
      s.returnedAt ? new Date(s.returnedAt).toLocaleDateString("zh-CN") : "",
      `"${(s.abnormalNote || "").replace(/"/g, '""')}"`,
    ].join(",");
  });

  return "\uFEFF" + header + "\n" + rows.join("\n");
}

/**
 * 获取单条寄样详情（含达人信息、跟进记录）
 */
export async function getSampleById(sampleId: number) {
  const [data] = await db
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
      userId: samples.userId,
      talentName: talents.name,
      talentPhone: talents.phone,
    })
    .from(samples)
    .leftJoin(talents, eq(samples.talentId, talents.id))
    .where(eq(samples.id, sampleId));

  if (!data) return null;

  const collectionList = await db
    .select({
      id: collections.id,
      note: collections.note,
      createdAt: collections.createdAt,
    })
    .from(collections)
    .where(eq(collections.sampleId, sampleId))
    .orderBy(desc(collections.createdAt));

  return { ...data, collections: collectionList };
}

/**
 * 获取寄样统计
 */
export async function getSampleStats(userId?: string) {
  const condition = userId ? eq(samples.userId, userId) : undefined;

  // 按状态统计
  const statusStats = await db
    .select({
      status: samples.status,
      count: sql<number>`count(*)`,
    })
    .from(samples)
    .where(condition)
    .groupBy(samples.status);

  const result: Record<string, number> = {};
  for (const row of statusStats) {
    result[row.status] = Number(row.count);
  }

  // 待收货数量：sent + 有回寄单号
  const [pendingResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(samples)
    .where(
      and(
        condition,
        eq(samples.status, "sent"),
        isNotNull(samples.returnTrackingNumber)
      )
    );
  result["pending_receipt"] = Number(pendingResult.count);

  // 异常数量
  const [abnormalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(samples)
    .where(
      and(condition, isNotNull(samples.abnormalNote))
    );
  result["abnormal"] = Number(abnormalResult.count);

  return result;
}
