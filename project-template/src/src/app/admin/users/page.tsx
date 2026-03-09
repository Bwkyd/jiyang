"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminUsersPage() {
  const { data, isLoading } = useSWR("/api/admin/users", fetcher);
  const usersList = data?.data || [];

  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "创建失败");
        return;
      }

      toast.success("商务账号创建成功");
      setOpen(false);
      setUsername("");
      setPassword("");
      mutate("/api/admin/users");
    } catch {
      toast.error("操作失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">账号管理</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            创建商务账号
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建商务账号</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                placeholder="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "创建中..." : "创建"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-center py-16 text-muted-foreground">加载中...</p>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersList.map(
                (u: {
                  id: string;
                  name: string;
                  username: string;
                  role: string;
                  isActive: boolean;
                  createdAt: string;
                }) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                        {u.role === "admin" ? "管理员" : "商务"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "outline" : "destructive"}>
                        {u.isActive ? "启用" : "禁用"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
