import { z } from "zod/v4";

export const createTalentSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
});

export const updateTalentSchema = createTalentSchema;

export type CreateTalentInput = z.infer<typeof createTalentSchema>;
export type UpdateTalentInput = z.infer<typeof updateTalentSchema>;
