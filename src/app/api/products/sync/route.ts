import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { syncProductsFromWechat } from "@/services/product.service";

export async function POST() {
  try {
    await requireAdmin();

    const result = await syncProductsFromWechat();
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "无权限" }, { status: 403 });
      }
    }
    console.error("POST /api/products/sync error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
