import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { batchUpdateSampleStatus } from "@/services/sample.service";
import { z } from "zod/v4";
import type { SampleStatus } from "@/types";

const batchUpdateSchema = z.object({
  sampleIds: z.array(z.number().int().positive()).min(1).max(100),
  status: z.enum(["collecting", "pending_receipt", "returned", "abnormal"]),
  abnormalNote: z.string().max(500).optional(),
  returnTrackingNumber: z.string().max(50).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const parsed = batchUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "参数错误", details: parsed.error },
        { status: 400 }
      );
    }

    const results = await batchUpdateSampleStatus({
      sampleIds: parsed.data.sampleIds,
      userId: user.id,
      newStatus: parsed.data.status as SampleStatus,
      abnormalNote: parsed.data.abnormalNote,
      returnTrackingNumber: parsed.data.returnTrackingNumber,
    });

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      data: results,
      summary: { succeeded, failed, total: results.length },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("PATCH /api/samples/batch-status error:", error);
    return NextResponse.json({ error: "批量更新失败" }, { status: 500 });
  }
}
