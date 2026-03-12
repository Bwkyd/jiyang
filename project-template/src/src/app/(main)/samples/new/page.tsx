"use client";

import { useState, useCallback } from "react";
import { ScanInput } from "@/components/sample/ScanInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { X, Package } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

interface PendingItem {
  skuCode: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NewSamplePage() {
  const [selectedTalentId, setSelectedTalentId] = useState<string>("");
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [duplicateAlert, setDuplicateAlert] = useState<string | null>(null);

  // 获取达人列表
  const { data: talentsData } = useSWR("/api/talents", fetcher);
  const talents = talentsData?.data || [];

  const handleScan = useCallback(
    (skuCode: string) => {
      // 检查本地重复
      if (pendingItems.some((item) => item.skuCode === skuCode)) {
        toast.warning("该 SKU 已在寄样清单中");
        return;
      }

      setPendingItems((prev) => [...prev, { skuCode }]);
      toast.success(`已添加: ${skuCode}`);
    },
    [pendingItems]
  );

  const handleRemoveItem = (skuCode: string) => {
    setPendingItems((prev) => prev.filter((item) => item.skuCode !== skuCode));
  };

  const handleSubmit = async () => {
    if (!selectedTalentId) {
      toast.error("请先选择达人");
      return;
    }
    if (pendingItems.length === 0) {
      toast.error("请先扫码添加样衣");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          talentId: Number(selectedTalentId),
          items: pendingItems.map((item) => ({ skuCode: item.skuCode })),
          trackingNumber: trackingNumber || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "寄样失败");
        return;
      }

      // 检查是否有重复项
      const results = data.data;
      const failed = results.filter(
        (r: { success: boolean }) => !r.success
      );
      const succeeded = results.filter(
        (r: { success: boolean }) => r.success
      );

      if (succeeded.length > 0) {
        toast.success(`成功寄出 ${succeeded.length} 件样衣`);
      }
      if (failed.length > 0) {
        setDuplicateAlert(
          failed
            .map(
              (r: { skuCode: string; error: string }) =>
                `${r.skuCode}: ${r.error}`
            )
            .join("\n")
        );
      }

      // 清空表单
      setPendingItems([]);
      setTrackingNumber("");
    } catch {
      toast.error("操作失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">新建寄样</h2>

      {/* 选择达人 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">选择达人</label>
        <Select value={selectedTalentId} onValueChange={(v) => v && setSelectedTalentId(v)}>
          <SelectTrigger>
            <SelectValue placeholder="搜索或选择达人..." />
          </SelectTrigger>
          <SelectContent>
            {talents.map(
              (talent: { id: number; name: string; unreturnedCount: number }) => (
                <SelectItem key={talent.id} value={String(talent.id)}>
                  {talent.name}
                  {talent.unreturnedCount > 0 && (
                    <span className="text-muted-foreground ml-2">
                      ({talent.unreturnedCount}件未还)
                    </span>
                  )}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* 扫码输入 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">扫码添加样衣</label>
        <ScanInput onScan={handleScan} />
      </div>

      {/* 寄样清单 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            寄样清单 ({pendingItems.length} 件)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              扫码添加样衣到寄样清单
            </p>
          ) : (
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <div
                  key={item.skuCode}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-mono">{item.skuCode}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(item.skuCode)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 快递单号 + 确认 */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">快递单号</label>
          <Input
            placeholder="选填，可后续补录..."
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
          />
        </div>

        <Button
          className="w-full h-12 text-base"
          onClick={handleSubmit}
          disabled={
            submitting || pendingItems.length === 0 || !selectedTalentId
          }
        >
          {submitting
            ? "提交中..."
            : `确认寄出 (${pendingItems.length} 件)`}
        </Button>
      </div>

      {/* 重复寄样提示 */}
      <AlertDialog
        open={!!duplicateAlert}
        onOpenChange={() => setDuplicateAlert(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>部分样衣寄出失败</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {duplicateAlert}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDuplicateAlert(null)}>
              我知道了
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
