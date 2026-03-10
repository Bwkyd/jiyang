import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { exportSamplesCSV } from "@/services/sample.service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(request.url);

    const csv = await exportSamplesCSV({
      userId: user.role === "admin" ? undefined : user.id,
      talentId: searchParams.get("talentId")
        ? Number(searchParams.get("talentId"))
        : undefined,
      status: searchParams.get("status") || undefined,
      keyword: searchParams.get("keyword") || undefined,
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="samples-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("GET /api/samples/export error:", error);
    return NextResponse.json({ error: "导出失败" }, { status: 500 });
  }
}
