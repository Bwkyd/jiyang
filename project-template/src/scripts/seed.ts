/**
 * 种子脚本：从微信小店同步商品 + 创建示例寄样数据
 *
 * 运行: bun run scripts/seed.ts
 */
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

const WECHAT_API_BASE = "https://api.weixin.qq.com";
const APP_ID = process.env.WECHAT_APP_ID!;
const APP_SECRET = process.env.WECHAT_APP_SECRET!;

// ===== 微信 API 调用 =====

async function getAccessToken(): Promise<string> {
  const url = `${WECHAT_API_BASE}/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.errcode) {
    throw new Error(`获取 token 失败: ${data.errcode} - ${data.errmsg}`);
  }
  console.log("✓ 获取 access_token 成功");
  return data.access_token;
}

async function fetchProductIds(
  token: string,
  nextKey?: string
): Promise<{ productIds: string[]; nextKey: string; total: number }> {
  const url = `${WECHAT_API_BASE}/channels/ec/product/list/get?access_token=${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: 5, // 上架中
      page_size: 30,
      next_key: nextKey || "",
    }),
  });
  const data = await res.json();
  if (data.errcode) {
    throw new Error(`获取商品列表失败: ${data.errcode} - ${data.errmsg}`);
  }
  return {
    productIds: data.product_ids || [],
    nextKey: data.next_key || "",
    total: data.total_num || 0,
  };
}

async function fetchProduct(token: string, productId: string) {
  const url = `${WECHAT_API_BASE}/channels/ec/product/get?access_token=${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: productId, data_type: 1 }),
  });
  const data = await res.json();
  if (data.errcode) {
    console.warn(`  ⚠ 商品 ${productId}: ${data.errcode} - ${data.errmsg}`);
    return null;
  }
  return data.product;
}

interface ParsedSku {
  productId: string;
  spuCode: string;
  skuCode: string;
  name: string;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
}

function parseSkus(product: any): ParsedSku[] {
  if (!product.skus) return [];
  return product.skus
    .filter((sku: any) => sku.status === 5)
    .map((sku: any) => {
      let color: string | null = null;
      let size: string | null = null;
      for (const attr of sku.sku_attrs || []) {
        const key = (attr.attr_key || "").toLowerCase();
        if (key.includes("颜色") || key.includes("color")) {
          color = attr.attr_value;
        } else if (
          key.includes("尺码") ||
          key.includes("尺寸") ||
          key.includes("size")
        ) {
          size = attr.attr_value;
        }
      }
      return {
        productId: String(product.product_id),
        spuCode: product.spu_code || String(product.product_id),
        skuCode: sku.sku_code || `${product.spu_code || product.product_id}-${sku.sku_id}`,
        name: product.title,
        color,
        size,
        imageUrl: sku.thumb_img || product.head_imgs?.[0] || null,
      };
    });
}

// ===== Step 1: 同步商品 =====

async function syncProducts() {
  console.log("\n===== 同步微信小店商品 =====\n");

  const token = await getAccessToken();

  // 获取商品 ID（只取前 2 页，约 60 个商品足够生成示例数据）
  const MAX_PAGES = 2;
  let allProductIds: string[] = [];
  let nextKey = "";
  let pageCount = 0;

  while (pageCount < MAX_PAGES) {
    const result = await fetchProductIds(token, nextKey || undefined);
    allProductIds.push(...result.productIds);
    console.log(
      `  获取商品ID: ${result.productIds.length} 个 (累计 ${allProductIds.length}/${result.total})`
    );
    nextKey = result.nextKey;
    pageCount++;
    if (!nextKey || result.productIds.length < 30) break;
  }

  if (allProductIds.length === 0) {
    console.log("  没有找到上架商品");
    return [];
  }

  // 逐个获取详情并保存
  let created = 0;
  let updated = 0;
  const allSkus: ParsedSku[] = [];

  for (const pid of allProductIds) {
    const product = await fetchProduct(token, pid);
    if (!product) continue;

    const skus = parseSkus(product);
    console.log(`  商品: ${product.title} → ${skus.length} 个 SKU`);

    for (const sku of skus) {
      allSkus.push(sku);

      const existing = await db.query.products.findFirst({
        where: eq(schema.products.skuCode, sku.skuCode),
      });

      if (existing) {
        await db
          .update(schema.products)
          .set({
            productId: sku.productId,
            spuCode: sku.spuCode,
            name: sku.name,
            color: sku.color,
            size: sku.size,
            imageUrl: sku.imageUrl,
            status: "active",
            syncedAt: new Date(),
          })
          .where(eq(schema.products.skuCode, sku.skuCode));
        updated++;
      } else {
        await db.insert(schema.products).values({
          productId: sku.productId,
          spuCode: sku.spuCode,
          skuCode: sku.skuCode,
          name: sku.name,
          color: sku.color,
          size: sku.size,
          imageUrl: sku.imageUrl,
          status: "active",
          syncedAt: new Date(),
        });
        created++;
      }
    }
  }

  console.log(`\n✓ 同步完成: 新增 ${created}，更新 ${updated}，共 ${allSkus.length} 个 SKU\n`);
  return allSkus;
}

// ===== Step 2: 创建示例数据 =====

async function seedSampleData(allSkus: ParsedSku[]) {
  if (allSkus.length === 0) {
    console.log("没有商品数据，跳过示例数据创建");
    return;
  }

  console.log("===== 创建示例寄样数据 =====\n");

  // 确保有管理员用户
  let admin = await db.query.users.findFirst({
    where: eq(schema.users.role, "admin"),
  });

  if (!admin) {
    console.log("  创建管理员账号...");
    const bcrypt = await import("bcryptjs");
    const [newAdmin] = await db
      .insert(schema.users)
      .values({
        username: "admin",
        password: await bcrypt.hash("admin123", 12),
        name: "管理员",
        role: "admin",
      })
      .returning();
    admin = newAdmin;
    console.log("  ✓ 管理员: admin / admin123");
  }

  // 确保有商务用户
  let bizUser = await db.query.users.findFirst({
    where: eq(schema.users.role, "business"),
  });

  if (!bizUser) {
    console.log("  创建商务账号...");
    const bcrypt = await import("bcryptjs");
    const [newBiz] = await db
      .insert(schema.users)
      .values({
        username: "xiaoli",
        password: await bcrypt.hash("123456", 12),
        name: "李小美",
        role: "business",
      })
      .returning();
    bizUser = newBiz;
    console.log("  ✓ 商务: xiaoli / 123456");
  }

  // 创建达人
  const talentData = [
    { name: "小鹿穿搭日记", phone: "13800001111", address: "杭州市西湖区文三路 168 号" },
    { name: "阿雅的衣橱", phone: "13900002222", address: "上海市静安区南京西路 1266 号" },
    { name: "Coco时尚笔记", phone: "13700003333", address: "广州市天河区天河北路 233 号" },
    { name: "甜甜圈穿搭", phone: "15800004444", address: "成都市锦江区春熙路 88 号" },
    { name: "大表姐OOTD", phone: "18600005555", address: "北京市朝阳区三里屯路 19 号" },
  ];

  const talentIds: number[] = [];
  for (const t of talentData) {
    const existing = await db.query.talents.findFirst({
      where: eq(schema.talents.name, t.name),
    });
    if (existing) {
      talentIds.push(existing.id);
    } else {
      const [created] = await db
        .insert(schema.talents)
        .values({ userId: bizUser.id, ...t })
        .returning();
      talentIds.push(created.id);
    }
  }
  console.log(`  ✓ ${talentIds.length} 位达人就绪`);

  // 检查是否已有寄样记录
  const [{ count: existingCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.samples);
  if (Number(existingCount) > 0) {
    console.log(`  已有 ${existingCount} 条寄样记录，跳过创建`);
    return;
  }

  // 从可用的 SKU 中创建寄样记录
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // 随机选择 SKU（不超过可用数量）
  const shuffled = [...allSkus].sort(() => Math.random() - 0.5);
  const sampleCount = Math.min(shuffled.length, 25);
  const selectedSkus = shuffled.slice(0, sampleCount);

  const statuses: { status: string; daysAgo: number; returned?: boolean; abnormal?: boolean }[] = [
    // 近期寄出，状态正常
    { status: "sent", daysAgo: 2 },
    { status: "sent", daysAgo: 5 },
    { status: "sent", daysAgo: 3 },
    { status: "sent", daysAgo: 1 },
    { status: "sent", daysAgo: 7 },
    // 超期未还
    { status: "sent", daysAgo: 45 },
    { status: "sent", daysAgo: 38 },
    { status: "sent", daysAgo: 60 },
    // 待收货
    { status: "pending_receipt", daysAgo: 10 },
    { status: "pending_receipt", daysAgo: 15 },
    { status: "pending_receipt", daysAgo: 8 },
    // 已归还
    { status: "returned", daysAgo: 20, returned: true },
    { status: "returned", daysAgo: 25, returned: true },
    { status: "returned", daysAgo: 30, returned: true },
    { status: "returned", daysAgo: 14, returned: true },
    { status: "returned", daysAgo: 35, returned: true },
    { status: "returned", daysAgo: 18, returned: true },
    // 异常
    { status: "abnormal", daysAgo: 22, abnormal: true },
    { status: "abnormal", daysAgo: 50, abnormal: true },
    // 更多已寄出
    { status: "sent", daysAgo: 12 },
    { status: "sent", daysAgo: 4 },
    { status: "sent", daysAgo: 6 },
    { status: "pending_receipt", daysAgo: 9 },
    { status: "sent", daysAgo: 33 },
    { status: "returned", daysAgo: 40, returned: true },
  ];

  const trackingPrefixes = ["SF", "YT", "ZT", "JD", "YD"];
  const abnormalReasons = [
    "达人反馈衣服有污渍，已拍照留证",
    "快递显示已签收但达人表示未收到，已发起快递查询",
  ];

  let createdCount = 0;
  for (let i = 0; i < sampleCount; i++) {
    const sku = selectedSkus[i];
    const statusInfo = statuses[i % statuses.length];
    const talentId = talentIds[i % talentIds.length];
    const sentAt = new Date(now - statusInfo.daysAgo * DAY);

    const prefix = trackingPrefixes[Math.floor(Math.random() * trackingPrefixes.length)];
    const trackingNumber = `${prefix}${String(1000000000 + Math.floor(Math.random() * 9000000000))}`;

    const values: any = {
      talentId,
      skuCode: sku.skuCode,
      userId: bizUser.id,
      status: statusInfo.status,
      trackingNumber,
      sentAt,
    };

    if (statusInfo.returned) {
      values.returnedAt = new Date(sentAt.getTime() + (5 + Math.floor(Math.random() * 10)) * DAY);
      const retPrefix = trackingPrefixes[Math.floor(Math.random() * trackingPrefixes.length)];
      values.returnTrackingNumber = `${retPrefix}${String(1000000000 + Math.floor(Math.random() * 9000000000))}`;
    }

    if (statusInfo.abnormal) {
      values.abnormalNote = abnormalReasons[i % abnormalReasons.length];
    }

    const [sample] = await db
      .insert(schema.samples)
      .values(values)
      .returning();
    createdCount++;

    // 给部分记录添加跟进记录
    if (statusInfo.daysAgo > 30 || statusInfo.abnormal) {
      await db.insert(schema.collections).values({
        sampleId: sample.id,
        userId: bizUser.id,
        note: statusInfo.abnormal
          ? "已联系达人确认异常情况，等待反馈"
          : `已电话联系达人催收，达人表示${statusInfo.daysAgo > 40 ? "近期归还" : "本周寄回"}`,
      });

      // 超期的再加一条跟进
      if (statusInfo.daysAgo > 40) {
        await db.insert(schema.collections).values({
          sampleId: sample.id,
          userId: bizUser.id,
          note: "二次催收，达人承诺3天内寄回",
        });
      }
    }
  }

  console.log(`  ✓ 创建 ${createdCount} 条寄样记录`);
}

// ===== 主流程 =====

async function main() {
  try {
    const allSkus = await syncProducts();
    await seedSampleData(allSkus);
    console.log("\n===== 全部完成 =====\n");
  } catch (error) {
    console.error("\n✗ 错误:", error);
  } finally {
    await client.end();
  }
}

main();
