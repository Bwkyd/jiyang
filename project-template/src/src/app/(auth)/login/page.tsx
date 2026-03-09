"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isInit, setIsInit] = useState(false);
  const [name, setName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "登录失败");
        return;
      }

      toast.success("登录成功");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "初始化失败");
        return;
      }

      toast.success("管理员账号创建成功，请登录");
      setIsInit(false);
      setName("");
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {isInit ? "初始化管理员" : "样衣寄样管理系统"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isInit ? "首次使用，请创建管理员账号" : "请登录您的账号"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={isInit ? handleInit : handleLogin} className="space-y-4">
            {isInit && (
              <Input
                placeholder="姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            <Input
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
            <Input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "请稍候..." : isInit ? "创建管理员" : "登录"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => setIsInit(!isInit)}
            >
              {isInit ? "返回登录" : "首次使用？初始化管理员账号"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
