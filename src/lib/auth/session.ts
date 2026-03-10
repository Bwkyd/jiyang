import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { User } from "@/types";

/**
 * 简易 session：从 cookie 中读取 userId，查询用户信息
 * 后续可替换为 Better Auth 的完整 session 方案
 */
export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionUserId = cookieStore.get("session_user_id")?.value;

  if (!sessionUserId) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, sessionUserId),
  });

  if (!user || !user.isActive) return null;

  return user;
}

/**
 * 获取 session，未登录则抛错
 */
export async function requireSession(): Promise<User> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/**
 * 要求管理员权限
 */
export async function requireAdmin(): Promise<User> {
  const session = await requireSession();
  if (session.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return session;
}
