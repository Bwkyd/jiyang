import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { updateSampleStatus } from "@/services/sample.service";
import { updateSampleStatusSchema } from "@/lib/validations/sample";
import type { SampleStatus } from "@/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSampleStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "参数错误", details: parsed.error },
        { status: 400 }
      );
    }

    const updated = await updateSampleStatus({
      sampleId: Number(id),
      userId: user.id,
      newStatus: parsed.data.status as SampleStatus,
      abnormalNote: parsed.data.abnormalNote,
      returnTrackingNumber: parsed.data.returnTrackingNumber,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
      }
      if (error.message.includes("不允许")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("PATCH /api/samples/[id]/status error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
