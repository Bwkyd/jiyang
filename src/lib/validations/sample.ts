import { z } from "zod/v4";

export const createBatchSampleSchema = z.object({
  talentId: z.number().int().positive(),
  items: z
    .array(
      z.object({
        skuCode: z.string().min(1).max(50),
      })
    )
    .min(1),
  trackingNumber: z.string().max(50).optional(),
});

export const updateSampleStatusSchema = z.object({
  status: z.enum(["collecting", "pending_receipt", "returned", "abnormal"]),
  abnormalNote: z.string().max(500).optional(),
  returnTrackingNumber: z.string().max(50).optional(),
});

export type CreateBatchSampleInput = z.infer<typeof createBatchSampleSchema>;
export type UpdateSampleStatusInput = z.infer<typeof updateSampleStatusSchema>;
