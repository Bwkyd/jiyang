import { db } from "@/lib/db";
import { samples, talents, products, collections } from "@/lib/db/schema";
import { eq, and, or, inArray, sql, desc, ilike } from "drizzle-orm";
import { STATUS_TRANSITIONS, type SampleStatus } from "@/types";
import { logAudit } from "./audit.service";

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

  await logAudit({
    userId,
    action: "sample.status_change",
    targetType: "sample",
    targetId: sampleId,
    detail: {
      from: currentStatus,
      to: newStatus,
      abnormalNote,
      returnTrackingNumber,
    },
  });

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
  keyword?: string; // 全局搜索：SKU / 达人名 / 快递单号
  page?: number;
  pageSize?: number;
}) {
  const { userId, talentId, status, trackingNumber, keyword, page = 1, pageSize = 20 } = params;

  const conditions = [];
  if (userId) conditions.push(eq(samples.userId, userId));
  if (talentId) conditions.push(eq(samples.talentId, talentId));
  if (status) conditions.push(eq(samples.status, status));
  if (trackingNumber) {
    conditions.push(sql`samples.tracking_number ILIKE ${`%${trackingNumber}%`}`);
  }
  // 全局关键字搜索：匹配 SKU、达人名或快递单号
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

  // 获取样衣数据（带达人信息 + 商品信息）
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
      // 商品信息
      productName: products.name,
      productImage: products.imageUrl,
      productColor: products.color,
      productSize: products.size,
    })
    .from(samples)
    .leftJoin(talents, eq(samples.talentId, talents.id))
    .leftJoin(products, eq(samples.skuCode, products.skuCode))
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
 * 批量更新寄样状态
 */
export async function batchUpdateSampleStatus(params: {
  sampleIds: number[];
  userId: string;
  newStatus: SampleStatus;
  abnormalNote?: string;
  returnTrackingNumber?: string;
}) {
  const { sampleIds, userId, newStatus, abnormalNote, returnTrackingNumber } = params;
  const results: { id: number; success: boolean; error?: string }[] = [];

  for (const sampleId of sampleIds) {
    try {
      await updateSampleStatus({
        sampleId,
        userId,
        newStatus,
        abnormalNote,
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
  if (status) conditions.push(eq(samples.status, status));
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
      productName: products.name,
      color: products.color,
      size: products.size,
    })
    .from(samples)
    .leftJoin(talents, eq(samples.talentId, talents.id))
    .leftJoin(products, eq(samples.skuCode, products.skuCode))
    .where(where)
    .orderBy(desc(samples.sentAt));

  const STATUS_LABEL_MAP: Record<string, string> = {
    sent: "已寄出",
    pending_receipt: "待收货",
    returned: "已归还",
    abnormal: "异常",
  };

  const header = "ID,SKU,商品名称,颜色,尺码,达人,状态,快递单号,回寄单号,寄出时间,归还时间,异常备注";
  const rows = data.map((s) =>
    [
      s.id,
      s.skuCode,
      `"${(s.productName || "").replace(/"/g, '""')}"`,
      s.color || "",
      s.size || "",
      s.talentName || "",
      STATUS_LABEL_MAP[s.status] || s.status,
      s.trackingNumber || "",
      s.returnTrackingNumber || "",
      s.sentAt ? new Date(s.sentAt).toLocaleDateString("zh-CN") : "",
      s.returnedAt ? new Date(s.returnedAt).toLocaleDateString("zh-CN") : "",
      `"${(s.abnormalNote || "").replace(/"/g, '""')}"`,
    ].join(",")
  );

  return "\uFEFF" + header + "\n" + rows.join("\n");
}

/**
 * 获取单条寄样详情（含商品信息、达人信息、跟进记录）
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
      productName: products.name,
      productImage: products.imageUrl,
      productColor: products.color,
      productSize: products.size,
    })
    .from(samples)
    .leftJoin(talents, eq(samples.talentId, talents.id))
    .leftJoin(products, eq(samples.skuCode, products.skuCode))
    .where(eq(samples.id, sampleId));

  if (!data) return null;

  // 获取跟进记录
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
