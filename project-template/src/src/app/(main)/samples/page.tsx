"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/sample/StatusBadge";
import { Plus, MessageCircle, Package } from "lucide-react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import type { SampleStatus } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const statusOptions: { value: SampleStatus; label: string }[] = [
  { value: "sent", label: "已寄出" },
  { value: "pending_receipt", label: "待收货" },
  { value: "returned", label: "已归还" },
  { value: "abnormal", label: "异常" },
];

export default function SamplesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [trackingSearch, setTrackingSearch] = useState("");
  const [followUpDialog, setFollowUpDialog] = useState<{
    open: boolean;
    sampleId: number;
    note: string;
  }>({ open: false, sampleId: 0, note: "" });
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    sampleId: number;
    currentStatus: string;
  }>({ open: false, sampleId: 0, currentStatus: "" });

  const queryParams = new URLSearchParams();
  if (statusFilter) queryParams.set("status", statusFilter);
  if (trackingSearch) queryParams.set("tracking", trackingSearch);

  const { data, isLoading } = useSWR(
    `/api/samples?${queryParams.toString()}`,
    fetcher
  );
  const samplesList = data?.data || [];

  // 更新状态
  const handleStatusChange = async (sampleId: number, newStatus: SampleStatus) => {
    try {
      const res = await fetch(`/api/samples/${sampleId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "更新失败");
        return;
      }

      toast.success("状态已更新");
      setStatusDialog({ open: false, sampleId: 0, currentStatus: "" });
      mutate(`/api/samples?${queryParams.toString()}`);
      router.refresh();
    } catch {
      toast.error("操作失败");
    }
  };

  // 添加催收/跟进记录
  const handleFollowUp = async () => {
    if (!followUpDialog.note.trim()) {
      toast.error("请输入跟进内容");
      return;
    }

    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sampleId: followUpDialog.sampleId,
          note: followUpDialog.note,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "添加失败");
        return;
      }

      toast.success("跟进记录已添加");
      setFollowUpDialog({ open: false, sampleId: 0, note: "" });
      mutate(`/api/samples?${queryParams.toString()}`);
    } catch {
      toast.error("操作失败");
    }
  };

  const statusFilters = [
    { label: "全部", value: "" },
    { label: "已寄出", value: "sent" },
    { label: "待收货", value: "pending_receipt" },
    { label: "已归还", value: "returned" },
    { label: "异常", value: "abnormal" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">寄样管理</h2>
        <Link href="/samples/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新建寄样
          </Button>
        </Link>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="搜索快递单号..."
          value={trackingSearch}
          onChange={(e) => setTrackingSearch(e.target.value)}
          className="w-48"
        />
        {statusFilters.map((filter) => (
          <Button
            key={filter.value}
            variant={statusFilter === filter.value || (!statusFilter && !filter.value) ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* 列表 */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">加载中...</div>
      ) : samplesList.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>暂无寄样记录</p>
          <Link href="/samples/new">
            <Button variant="outline" className="mt-4">
              去寄样
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>达人</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>快递单号</TableHead>
                  <TableHead>寄出时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {samplesList.map(
                  (sample: {
                    id: number;
                    skuCode: string;
                    talentName: string | null;
                    status: SampleStatus;
                    trackingNumber: string | null;
                    sentAt: string;
                    collectionCount: number;
                  }) => (
                    <TableRow key={sample.id}>
                      <TableCell className="font-mono text-sm">
                        {sample.skuCode}
                      </TableCell>
                      <TableCell>{sample.talentName || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          className="h-auto p-1"
                          onClick={() =>
                            setStatusDialog({
                              open: true,
                              sampleId: sample.id,
                              currentStatus: sample.status,
                            })
                          }
                        >
                          <StatusBadge status={sample.status} />
                        </Button>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sample.trackingNumber || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(sample.sentAt).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setFollowUpDialog({
                              open: true,
                              sampleId: sample.id,
                              note: "",
                            })
                          }
                          className={sample.collectionCount > 0 ? "text-orange-600" : ""}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          {sample.collectionCount > 0
                            ? `跟进(${sample.collectionCount})`
                            : "跟进"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          {data?.total > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>共 {data.total} 条记录</span>
            </div>
          )}
        </>
      )}

      {/* 状态修改弹窗 */}
      <Dialog
        open={statusDialog.open}
        onOpenChange={(open) =>
          setStatusDialog({ ...statusDialog, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改状态</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {statusOptions.map((opt) => (
              <Button
                key={opt.value}
                variant={
                  statusDialog.currentStatus === opt.value
                    ? "default"
                    : "outline"
                }
                className="w-full"
                onClick={() => handleStatusChange(statusDialog.sampleId, opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 添加跟进记录弹窗 */}
      <Dialog
        open={followUpDialog.open}
        onOpenChange={(open) =>
          setFollowUpDialog({ ...followUpDialog, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加跟进记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="填写跟进内容..."
              value={followUpDialog.note}
              onChange={(e) =>
                setFollowUpDialog({ ...followUpDialog, note: e.target.value })
              }
              rows={4}
            />
            <Button className="w-full" onClick={handleFollowUp}>
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
