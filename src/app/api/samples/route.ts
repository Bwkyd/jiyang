import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getSamples, createSamples, getSampleStats } from "@/services/sample.service";
import { createBatchSampleSchema } from "@/lib/validations/sample";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(request.url);

    const params = {
      userId: user.role === "admin" ? undefined : user.id,
      talentId: searchParams.get("talentId")
        ? Number(searchParams.get("talentId"))
        : undefined,
      status: searchParams.get("status") || undefined,
      trackingNumber: searchParams.get("tracking") || undefined,
      keyword: searchParams.get("keyword") || undefined,
      page: Number(searchParams.get("page") || "1"),
      pageSize: Number(searchParams.get("pageSize") || "20"),
    };

    const result = await getSamples(params);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("GET /api/samples error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const parsed = createBatchSampleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "参数错误", details: parsed.error },
        { status: 400 }
      );
    }

    const results = await createSamples({
      talentId: parsed.data.talentId,
      userId: user.id,
      items: parsed.data.items,
      trackingNumber: parsed.data.trackingNumber,
    });

    return NextResponse.json({ data: results }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("POST /api/samples error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
