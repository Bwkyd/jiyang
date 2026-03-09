"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TalentsPage() {
  const { data, isLoading } = useSWR("/api/talents", fetcher);
  const talents = data?.data || [];

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/talents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone || undefined,
          address: address || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "创建失败");
        return;
      }

      toast.success("达人创建成功");
      setOpen(false);
      setName("");
      setPhone("");
      setAddress("");
      mutate("/api/talents");
    } catch {
      toast.error("操作失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">达人管理</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            添加达人
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加达人</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="达人姓名"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">联系电话</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="选填"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">收货地址</label>
                <Textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="选填"
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "保存中..." : "添加"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">加载中...</div>
      ) : talents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>暂无达人</p>
          <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>
            添加达人
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {talents.map(
            (talent: {
              id: number;
              name: string;
              phone: string | null;
              unreturnedCount: number;
            }) => (
              <Link key={talent.id} href={`/talents/${talent.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{talent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {talent.phone || "未填写电话"}
                        </p>
                      </div>
                      {talent.unreturnedCount > 0 && (
                        <Badge variant="secondary">
                          {talent.unreturnedCount} 件未还
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
