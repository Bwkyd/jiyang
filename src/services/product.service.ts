import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchAllProducts, type ParsedProduct } from "@/lib/wechat/api";

/**
 * 按 SKU 编码查询商品
 */
export async function getProductBySku(skuCode: string) {
  return db.query.products.findFirst({
    where: eq(products.skuCode, skuCode),
  });
}

/**
 * 搜索商品（按名称或 SKU 模糊匹配）
 */
export async function searchProducts(keyword: string, limit = 20) {
  const { ilike, or } = await import("drizzle-orm");
  const pattern = `%${keyword}%`;

  return db.query.products.findMany({
    where: or(
      ilike(products.name, pattern),
      ilike(products.skuCode, pattern),
      ilike(products.spuCode, pattern)
    ),
    limit,
  });
}

/**
 * 从微信小店同步商品数据到本地数据库
 * 使用 upsert 策略：SKU 存在则更新，不存在则插入
 */
export async function syncProductsFromWechat(): Promise<{
  total: number;
  created: number;
  updated: number;
}> {
  const allSkus: ParsedProduct[] = await fetchAllProducts();

  let created = 0;
  let updated = 0;

  for (const sku of allSkus) {
    const existing = await db.query.products.findFirst({
      where: eq(products.skuCode, sku.skuCode),
    });

    if (existing) {
      await db
        .update(products)
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
        .where(eq(products.skuCode, sku.skuCode));
      updated++;
    } else {
      await db.insert(products).values({
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

  return { total: allSkus.length, created, updated };
}
