import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";

// 登录：每个 IP 每分钟最多 5 次
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  try {
    // 速率限制
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rl = rateLimit(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
    if (!rl.success) {
      return NextResponse.json(
        { error: "登录尝试过于频繁，请稍后再试" },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((rl.resetAt - Date.now()) / 1000)
            ),
          },
        }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "账号已被禁用，请联系管理员" },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 设置 session cookie
    const cookieStore = await cookies();
    cookieStore.set("session_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
