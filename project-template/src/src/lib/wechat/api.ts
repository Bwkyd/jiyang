import {
  WECHAT_PRODUCT_LIST_URL,
  WECHAT_PRODUCT_GET_URL,
  WECHAT_SYNC_PAGE_SIZE,
  WECHAT_PRODUCT_STATUS_LISTED,
} from "@/constants";
import { getAccessToken } from "./token";

// ===== 微信小店 API 响应类型 =====

interface WechatSkuAttr {
  attr_key: string;
  attr_value: string;
}

interface WechatSku {
  sku_id: number;
  sku_code: string;
  thumb_img: string;
  sale_price: number;
  stock_num: number;
  status: number;
  sku_attrs: WechatSkuAttr[];
}

interface WechatProduct {
  product_id: number;
  title: string;
  head_imgs: string[];
  spu_code: string;
  status: number;
  skus: WechatSku[];
}

interface ProductListResponse {
  errcode: number;
  errmsg: string;
  product_ids: string[];
  next_key: string;
  total_num: number;
}

interface ProductGetResponse {
  errcode: number;
  errmsg: string;
  product: WechatProduct;
}

// ===== 解析后的商品数据 =====

export interface ParsedProduct {
  productId: string;
  spuCode: string;
  skuCode: string;
  name: string;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
}

/**
 * 获取上架中的商品ID列表（分页）
 */
export async function fetchProductIds(
  nextKey?: string
): Promise<{ productIds: string[]; nextKey: string; total: number }> {
  const token = await getAccessToken();
  const url = `${WECHAT_PRODUCT_LIST_URL}?access_token=${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: WECHAT_PRODUCT_STATUS_LISTED,
      page_size: WECHAT_SYNC_PAGE_SIZE,
      next_key: nextKey || "",
    }),
  });

  const data: ProductListResponse = await res.json();

  if (data.errcode) {
    throw new Error(
      `获取商品列表失败: ${data.errcode} - ${data.errmsg}`
    );
  }

  return {
    productIds: data.product_ids || [],
    nextKey: data.next_key || "",
    total: data.total_num || 0,
  };
}

/**
 * 获取单个商品详情
 */
export async function fetchProduct(
  productId: string
): Promise<WechatProduct | null> {
  const token = await getAccessToken();
  const url = `${WECHAT_PRODUCT_GET_URL}?access_token=${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: productId,
      data_type: 1, // 线上数据
    }),
  });

  const data: ProductGetResponse = await res.json();

  if (data.errcode) {
    console.error(`获取商品 ${productId} 失败: ${data.errcode} - ${data.errmsg}`);
    return null;
  }

  return data.product;
}

/**
 * 从微信商品数据中解析出 SKU 列表
 * 提取颜色和尺码信息
 */
export function parseProductSkus(product: WechatProduct): ParsedProduct[] {
  return product.skus
    .filter((sku) => sku.status === WECHAT_PRODUCT_STATUS_LISTED)
    .map((sku) => {
      // 从 sku_attrs 中提取颜色和尺码
      let color: string | null = null;
      let size: string | null = null;

      for (const attr of sku.sku_attrs) {
        const key = attr.attr_key.toLowerCase();
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
        skuCode: sku.sku_code || `${product.spu_code}-${sku.sku_id}`,
        name: product.title,
        color,
        size,
        imageUrl: sku.thumb_img || product.head_imgs?.[0] || null,
      };
    });
}

/**
 * 获取所有上架商品的全部 SKU（自动翻页）
 */
export async function fetchAllProducts(): Promise<ParsedProduct[]> {
  const allProducts: ParsedProduct[] = [];
  let nextKey = "";
  let hasMore = true;

  while (hasMore) {
    const { productIds, nextKey: newNextKey } =
      await fetchProductIds(nextKey || undefined);

    if (productIds.length === 0) {
      break;
    }

    // 逐个获取商品详情并解析 SKU
    for (const pid of productIds) {
      const product = await fetchProduct(pid);
      if (product) {
        const skus = parseProductSkus(product);
        allProducts.push(...skus);
      }
    }

    nextKey = newNextKey;
    hasMore = !!nextKey && productIds.length === WECHAT_SYNC_PAGE_SIZE;
  }

  return allProducts;
}
