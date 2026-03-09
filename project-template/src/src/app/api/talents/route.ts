import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createTalent, getTalentsByUser } from "@/services/talent.service";
import { createTalentSchema } from "@/lib/validations/talent";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword") || undefined;

    const talents = await getTalentsByUser(user.id, keyword);
    return NextResponse.json({ data: talents });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("GET /api/talents error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const parsed = createTalentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "参数错误", details: parsed.error },
        { status: 400 }
      );
    }

    const talent = await createTalent(user.id, parsed.data);
    return NextResponse.json({ data: talent }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
      }
      if (error.message.includes("已存在")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("POST /api/talents error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
