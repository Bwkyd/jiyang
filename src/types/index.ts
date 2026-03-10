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

// ===== 状态枚举 =====
export const SAMPLE_STATUS = {
  SENT: "sent",
  PENDING_RECEIPT: "pending_receipt",
  RETURNED: "returned",
  ABNORMAL: "abnormal",
} as const;

export type SampleStatus = (typeof SAMPLE_STATUS)[keyof typeof SAMPLE_STATUS];

// 状态流转规则：当前状态 → 可流转的目标状态
export const STATUS_TRANSITIONS: Record<SampleStatus, SampleStatus[]> = {
  sent: ["pending_receipt", "abnormal"],
  pending_receipt: ["returned", "abnormal"],
  returned: [],
  abnormal: [],
};

// 状态显示名称
export const STATUS_LABEL: Record<SampleStatus, string> = {
  sent: "已寄出",
  pending_receipt: "待收货",
  returned: "已归还",
  abnormal: "异常",
};

// ===== 角色枚举 =====
export const USER_ROLE = {
  ADMIN: "admin",
  BUSINESS: "business",
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
