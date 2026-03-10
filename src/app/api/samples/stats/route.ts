import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getSampleStats } from "@/services/sample.service";

export async function GET() {
  try {
    const user = await requireSession();
    const userId = user.role === "admin" ? undefined : user.id;
    const stats = await getSampleStats(userId);
    return NextResponse.json({ data: stats });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("GET /api/samples/stats error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
