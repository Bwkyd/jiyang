import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { updateSampleTags } from "@/services/sample.service";
import { updateSampleTagsSchema } from "@/lib/validations/sample";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSampleTagsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "参数错误", details: parsed.error },
        { status: 400 }
      );
    }

    const updated = await updateSampleTags({
      sampleId: Number(id),
      userId: user.id,
      abnormalNote: parsed.data.abnormalNote,
      returnTrackingNumber: parsed.data.returnTrackingNumber,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
      }
      if (error.message.includes("不存在")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    console.error("PATCH /api/samples/[id]/tags error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
