"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, SampleTags } from "@/components/sample/StatusBadge";
import {
  ArrowLeft,
  Package,
  User,
  Truck,
  MessageCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SampleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [followUpNote, setFollowUpNote] = useState("");
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [abnormalNote, setAbnormalNote] = useState("");
  const [returnTrackingNumber, setReturnTrackingNumber] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const swrKey = `/api/samples/${id}`;
  const { data, isLoading } = useSWR(swrKey, fetcher);
  const sample = data?.data;

  const handleReturn = async () => {
    setUpdatingStatus(true);
    try {
      const body: Record<string, string> = { status: "returned" };
      if (returnTrackingNumber) {
        body.returnTrackingNumber = returnTrackingNumber;
      }

      const res = await fetch(`/api/samples/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "更新失败");
        return;
      }

      toast.success("已确认归还");
      setReturnTrackingNumber("");
      mutate(swrKey);
    } catch {
      toast.error("操作失败");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleTagUpdate = async (tags: {
    abnormalNote?: string | null;
    returnTrackingNumber?: string | null;
  }) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/samples/${id}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tags),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "更新失败");
        return;
      }

      toast.success("已更新");
      setAbnormalNote("");
      setReturnTrackingNumber("");
      mutate(swrKey);
    } catch {
      toast.error("操作失败");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleFollowUp = async () => {
    if (!followUpNote.trim()) {
      toast.error("请输入跟进内容");
      return;
    }
    setSubmittingFollowUp(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleId: Number(id), note: followUpNote }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "添加失败");
        return;
      }
      toast.success("跟进记录已添加");
      setFollowUpNote("");
      mutate(swrKey);
    } catch {
      toast.error("操作失败");
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-16 text-muted-foreground">加载中...</div>
    );
  }

  if (!sample) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        记录不存在
      </div>
    );
  }

  const isSent = sample.status === "sent";
  const daysSinceSent = Math.floor(
    (Date.now() - new Date(sample.sentAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold">寄样详情</h2>
      </div>

      {/* 样衣信息卡片 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <h3 className="font-semibold text-lg font-mono">
                {sample.skuCode}
              </h3>
              <div className="flex items-center gap-2 pt-1">
                <StatusBadge status={sample.status} />
                <SampleTags
                  abnormalNote={sample.abnormalNote}
                  returnTrackingNumber={sample.returnTrackingNumber}
                  status={sample.status}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 基本信息 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground w-16">达人</span>
            <span className="font-medium">{sample.talentName}</span>
            {sample.talentPhone && (
              <span className="text-muted-foreground ml-1">
                {sample.talentPhone}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground w-16">寄出</span>
            <span>
              {new Date(sample.sentAt).toLocaleDateString("zh-CN")}
            </span>
            <Badge variant="outline" className="ml-1">
              {daysSinceSent} 天前
            </Badge>
          </div>
          {sample.trackingNumber && (
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground w-16">寄出单号</span>
              <span className="font-mono">{sample.trackingNumber}</span>
            </div>
          )}
          {sample.returnTrackingNumber && (
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground w-16">回寄单号</span>
              <span className="font-mono">
                {sample.returnTrackingNumber}
              </span>
            </div>
          )}
          {sample.returnedAt && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground w-16">归还</span>
              <span>
                {new Date(sample.returnedAt).toLocaleDateString("zh-CN")}
              </span>
            </div>
          )}
          {sample.abnormalNote && (
            <div className="flex items-start gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground w-16">异常</span>
              <span className="text-red-600">{sample.abnormalNote}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 操作区域 - 仅已寄出状态显示 */}
      {isSent && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 回寄单号 + 确认归还/标记待收货 */}
            {!sample.returnTrackingNumber && (
              <Input
                placeholder="回寄快递单号（选填）"
                value={returnTrackingNumber}
                onChange={(e) => setReturnTrackingNumber(e.target.value)}
              />
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={updatingStatus}
                onClick={handleReturn}
              >
                确认归还
              </Button>
              {!sample.returnTrackingNumber ? (
                <Button
                  className="flex-1"
                  variant="outline"
                  disabled={updatingStatus || !returnTrackingNumber.trim()}
                  onClick={() =>
                    handleTagUpdate({
                      returnTrackingNumber: returnTrackingNumber,
                    })
                  }
                >
                  标记待收货
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  variant="outline"
                  disabled={updatingStatus}
                  onClick={() =>
                    handleTagUpdate({ returnTrackingNumber: null })
                  }
                >
                  取消待收货
                </Button>
              )}
            </div>

            <Separator />

            {/* 标记异常 */}
            {!sample.abnormalNote ? (
              <div className="space-y-2">
                <Input
                  placeholder="异常原因说明"
                  value={abnormalNote}
                  onChange={(e) => setAbnormalNote(e.target.value)}
                />
                <Button
                  className="w-full"
                  variant="destructive"
                  disabled={updatingStatus || !abnormalNote.trim()}
                  onClick={() =>
                    handleTagUpdate({ abnormalNote: abnormalNote })
                  }
                >
                  标记异常
                </Button>
              </div>
            ) : (
              <Button
                className="w-full"
                variant="outline"
                disabled={updatingStatus}
                onClick={() => handleTagUpdate({ abnormalNote: null })}
              >
                取消异常标记
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 跟进记录 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            跟进记录
            {sample.collections?.length > 0 && (
              <Badge variant="secondary">{sample.collections.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 添加跟进 */}
          <div className="flex gap-2">
            <Textarea
              placeholder="添加跟进记录..."
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button
              className="self-end"
              disabled={submittingFollowUp || !followUpNote.trim()}
              onClick={handleFollowUp}
            >
              发送
            </Button>
          </div>

          {sample.collections?.length > 0 && <Separator />}

          {/* 历史记录 */}
          <div className="space-y-3">
            {sample.collections?.map(
              (c: { id: number; note: string | null; createdAt: string }) => (
                <div key={c.id} className="text-sm">
                  <div className="text-muted-foreground text-xs mb-0.5">
                    {new Date(c.createdAt).toLocaleString("zh-CN")}
                  </div>
                  <div>{c.note || "（无备注）"}</div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
