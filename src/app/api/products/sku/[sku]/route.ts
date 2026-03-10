import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getProductBySku } from "@/services/product.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sku: string }> }
) {
  try {
    await requireSession();
    const { sku } = await params;

    const product = await getProductBySku(sku);
    if (!product) {
      return NextResponse.json(
        { error: "未找到该商品，请确认条码" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: product });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("GET /api/products/sku error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
