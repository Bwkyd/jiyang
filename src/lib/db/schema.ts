import {
  pgTable,
  uuid,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ===== 用户表 =====
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("business"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ===== 达人表 =====
export const talents = pgTable(
  "talents",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    name: varchar("name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    address: text("address"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_talents_user_id").on(table.userId),
    userNameUniq: uniqueIndex("uniq_talents_user_name").on(
      table.userId,
      table.name
    ),
  })
);

// ===== 商品表 =====
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    productId: varchar("product_id", { length: 50 }),
    spuCode: varchar("spu_code", { length: 50 }).notNull(),
    skuCode: varchar("sku_code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    color: varchar("color", { length: 50 }),
    size: varchar("size", { length: 20 }),
    imageUrl: text("image_url"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    syncedAt: timestamp("synced_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    spuIdx: index("idx_products_spu_code").on(table.spuCode),
  })
);

// ===== 寄样记录表 =====
export const samples = pgTable(
  "samples",
  {
    id: serial("id").primaryKey(),
    talentId: integer("talent_id")
      .notNull()
      .references(() => talents.id),
    skuCode: varchar("sku_code", { length: 50 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    status: varchar("status", { length: 20 }).notNull().default("sent"),
    trackingNumber: varchar("tracking_number", { length: 50 }),
    returnTrackingNumber: varchar("return_tracking_number", { length: 50 }),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
    returnedAt: timestamp("returned_at"),
    abnormalNote: text("abnormal_note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    talentIdx: index("idx_samples_talent_id").on(table.talentId),
    userIdx: index("idx_samples_user_id").on(table.userId),
    skuIdx: index("idx_samples_sku_code").on(table.skuCode),
    statusIdx: index("idx_samples_status").on(table.status),
    sentAtIdx: index("idx_samples_sent_at").on(table.sentAt),
  })
);

// ===== 催收记录表 =====
export const collections = pgTable(
  "collections",
  {
    id: serial("id").primaryKey(),
    sampleId: integer("sample_id")
      .notNull()
      .references(() => samples.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    sampleIdx: index("idx_collections_sample_id").on(table.sampleId),
  })
);

// ===== 系统设置表 =====
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 50 }).notNull().unique(),
  value: varchar("value", { length: 200 }).notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ===== 审计日志表 =====
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    action: varchar("action", { length: 50 }).notNull(), // e.g. sample.status_change, sample.create
    targetType: varchar("target_type", { length: 50 }).notNull(), // e.g. sample, talent
    targetId: varchar("target_id", { length: 50 }).notNull(),
    detail: text("detail"), // JSON string with before/after values
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_audit_logs_user_id").on(table.userId),
    targetIdx: index("idx_audit_logs_target").on(
      table.targetType,
      table.targetId
    ),
    createdAtIdx: index("idx_audit_logs_created_at").on(table.createdAt),
  })
);
