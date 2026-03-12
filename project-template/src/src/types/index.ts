import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  users,
  talents,
  products,
  samples,
  collections,
} from "@/lib/db/schema";

// ===== 数据库模型类型 =====
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Talent = InferSelectModel<typeof talents>;
export type NewTalent = InferInsertModel<typeof talents>;

export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

export type Sample = InferSelectModel<typeof samples>;
export type NewSample = InferInsertModel<typeof samples>;

export type Collection = InferSelectModel<typeof collections>;
export type NewCollection = InferInsertModel<typeof collections>;

// ===== 状态枚举（仅 sent / returned 两种真实状态） =====
export const SAMPLE_STATUS = {
  SENT: "sent",
  RETURNED: "returned",
} as const;

export type SampleStatus = (typeof SAMPLE_STATUS)[keyof typeof SAMPLE_STATUS];

// 状态显示名称
export const STATUS_LABEL: Record<SampleStatus, string> = {
  sent: "已寄出",
  returned: "已归还",
};

// ===== 角色枚举 =====
export const USER_ROLE = {
  ADMIN: "admin",
  BUSINESS: "business",
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
