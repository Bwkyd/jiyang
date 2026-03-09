import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";

export async function GET() {
  try {
    await requireAdmin();

    const allUsers = await db.query.users.findMany({
      columns: {
        password: false,
      },
    });

    return NextResponse.json({ data: allUsers });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED")
        return NextResponse.json({ error: "未登录" }, { status: 401 });
      if (error.message === "FORBIDDEN")
        return NextResponse.json({ error: "无权限" }, { status: 403 });
    }
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existing = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    if (existing) {
      return NextResponse.json(
        { error: "用户名已存在" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        name: username, // 用用户名作为显示名
        role: "business",
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED")
        return NextResponse.json({ error: "未登录" }, { status: 401 });
      if (error.message === "FORBIDDEN")
        return NextResponse.json({ error: "无权限" }, { status: 403 });
    }
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
