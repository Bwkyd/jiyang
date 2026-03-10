import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";

/**
 * 初始化管理员账号
 * 仅当 users 表为空时可用
 */
export async function POST(request: NextRequest) {
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    if (Number(count) > 0) {
      return NextResponse.json(
        { error: "系统已初始化，无法再次创建管理员" },
        { status: 400 }
      );
    }

    const { username, password, name } = await request.json();

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: "用户名、密码和姓名不能为空" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const [admin] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        name,
        role: "admin",
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
          role: admin.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/auth/init error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
