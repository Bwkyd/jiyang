import { db } from "@/lib/db";
import { talents, samples } from "@/lib/db/schema";
import { eq, and, sql, ilike, inArray } from "drizzle-orm";
import type { CreateTalentInput } from "@/lib/validations/talent";

/**
 * 创建达人
 */
export async function createTalent(userId: string, data: CreateTalentInput) {
  // 检查同一商务下是否已有同名达人
  const existing = await db.query.talents.findFirst({
    where: and(eq(talents.userId, userId), eq(talents.name, data.name)),
  });

  if (existing) {
    throw new Error("该达人姓名已存在");
  }

  const [talent] = await db
    .insert(talents)
    .values({
      userId,
      name: data.name,
      phone: data.phone || null,
      address: data.address || null,
    })
    .returning();

  return talent;
}

/**
 * 获取商务的达人列表（含未归还样衣数）
 */
export async function getTalentsByUser(userId: string, keyword?: string) {
  const conditions = [eq(talents.userId, userId)];
  if (keyword) {
    conditions.push(ilike(talents.name, `%${keyword}%`));
  }

  const talentList = await db.query.talents.findMany({
    where: and(...conditions),
  });

  // 查询每个达人的未归还样衣数
  const activeStatuses = ["sent", "collecting", "pending_receipt"];

  const talentIds = talentList.map((t) => t.id);
  if (talentIds.length === 0) return [];

  const unreturned = await db
    .select({
      talentId: samples.talentId,
      count: sql<number>`count(*)`,
    })
    .from(samples)
    .where(
      and(
        inArray(samples.talentId, talentIds),
        inArray(samples.status, activeStatuses)
      )
    )
    .groupBy(samples.talentId);

  const unreturnedMap = new Map(
    unreturned.map((r) => [r.talentId, Number(r.count)])
  );

  return talentList.map((t) => ({
    ...t,
    unreturnedCount: unreturnedMap.get(t.id) || 0,
  }));
}

/**
 * 获取达人详情
 */
export async function getTalentById(talentId: number, userId?: string) {
  const conditions = [eq(talents.id, talentId)];
  if (userId) conditions.push(eq(talents.userId, userId));

  return db.query.talents.findFirst({
    where: and(...conditions),
  });
}

/**
 * 更新达人信息
 */
export async function updateTalent(
  talentId: number,
  userId: string,
  data: Partial<CreateTalentInput>
) {
  const [updated] = await db
    .update(talents)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(talents.id, talentId), eq(talents.userId, userId)))
    .returning();

  if (!updated) {
    throw new Error("达人不存在或无权限修改");
  }

  return updated;
}
