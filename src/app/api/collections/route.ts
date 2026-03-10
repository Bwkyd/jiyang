import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import {
  getOverdueSamples,
  createCollection,
} from "@/services/collection.service";

export async function GET() {
  try {
    const user = await requireSession();
    const userId = user.role === "admin" ? undefined : user.id;
    const overdue = await getOverdueSamples(userId);
    return NextResponse.json({ data: overdue });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("GET /api/collections error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const { sampleId, note } = await request.json();

    if (!sampleId) {
      return NextResponse.json(
        { error: "缺少寄样记录ID" },
        { status: 400 }
      );
    }

    const collection = await createCollection({
      sampleId: Number(sampleId),
      userId: user.id,
      note,
    });

    return NextResponse.json({ data: collection }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("POST /api/collections error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
