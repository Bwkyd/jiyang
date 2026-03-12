"use client";

import { useState, useCallback } from "react";
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
import { StatusBadge, SampleTags } from "@/components/sample/StatusBadge";
import {
  Plus,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SampleItem {
  id: number;
  skuCode: string;
  talentName: string | null;
  status: string;
  trackingNumber: string | null;
  returnTrackingNumber: string | null;
  abnormalNote: string | null;
  sentAt: string;
  collectionCount: number;
}

export default function SamplesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // 批量操作
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [batchDialog, setBatchDialog] = useState(false);

  const queryParams = new URLSearchParams();
  if (statusFilter) queryParams.set("status", statusFilter);
  if (keyword) queryParams.set("keyword", keyword);
  queryParams.set("page", String(page));
  queryParams.set("pageSize", String(pageSize));

  const swrKey = `/api/samples?${queryParams.toString()}`;
  const { data, isLoading } = useSWR(swrKey, fetcher);
  const samplesList: SampleItem[] = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleSearch = useCallback(() => {
    setKeyword(searchInput);
    setPage(1);
  }, [searchInput]);

  // 批量确认归还
  const handleBatchReturn = async () => {
    if (selectedIds.size === 0) return;
    try {
      const res = await fetch("/api/samples/batch-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sampleIds: Array.from(selectedIds),
          status: "returned",
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "批量更新失败");
        return;
      }
      const { succeeded, failed } = result.summary;
      if (succeeded > 0) toast.success(`成功更新 ${succeeded} 条`);
      if (failed > 0) toast.warning(`${failed} 条更新失败`);
      setBatchDialog(false);
      setSelectedIds(new Set());
      setBatchMode(false);
      mutate(swrKey);
    } catch {
      toast.error("操作失败");
    }
  };

  const handleExport = () => {
    const exportParams = new URLSearchParams();
    if (statusFilter) exportParams.set("status", statusFilter);
    if (keyword) exportParams.set("keyword", keyword);
    window.open(`/api/samples/export?${exportParams.toString()}`, "_blank");
  };

  const handleToggleAll = () => {
    if (selectedIds.size === samplesList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(samplesList.map((s) => s.id)));
    }
  };

  const handleToggleOne = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const statusFilters = [
    { label: "全部", value: "" },
    { label: "已寄出", value: "sent" },
    { label: "已归还", value: "returned" },
    { label: "待收货", value: "pending_receipt" },
    { label: "异常", value: "abnormal" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">寄样管理</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          <Button
            variant={batchMode ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              setBatchMode(!batchMode);
              setSelectedIds(new Set());
            }}
          >
            <CheckSquare className="h-4 w-4 mr-1" />
            批量
          </Button>
          <Link href="/samples/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              新建寄样
            </Button>
          </Link>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1">
          <Input
            placeholder="搜索样衣 / 达人 / 单号..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-56"
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {statusFilters.map((filter) => (
          <Button
            key={filter.value}
            variant={
              statusFilter === filter.value ||
              (!statusFilter && !filter.value)
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => {
              setStatusFilter(filter.value);
              setPage(1);
            }}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* 批量操作栏 */}
      {batchMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 bg-muted p-3 rounded-md">
          <span className="text-sm">已选 {selectedIds.size} 条</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBatchDialog(true)}
          >
            批量确认归还
          </Button>
        </div>
      )}

      {/* 列表 */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          加载中...
        </div>
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
                  {batchMode && (
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === samplesList.length}
                        onChange={handleToggleAll}
                        className="rounded"
                      />
                    </TableHead>
                  )}
                  <TableHead>SKU</TableHead>
                  <TableHead>达人</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="hidden md:table-cell">
                    寄出时间
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {samplesList.map((sample) => (
                  <TableRow
                    key={sample.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/samples/${sample.id}`)}
                  >
                    {batchMode && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(sample.id)}
                          onClick={(e) => handleToggleOne(e, sample.id)}
                          onChange={() => {}}
                          className="rounded"
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="text-sm font-mono">{sample.skuCode}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {sample.talentName || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        <StatusBadge status={sample.status} />
                        <SampleTags
                          abnormalNote={sample.abnormalNote}
                          returnTrackingNumber={sample.returnTrackingNumber}
                          status={sample.status}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                      {new Date(sample.sentAt).toLocaleDateString("zh-CN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              共 {total} 条，第 {page}/{totalPages || 1} 页
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* 批量确认归还弹窗 */}
      <Dialog open={batchDialog} onOpenChange={setBatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              确认批量归还（{selectedIds.size} 条）
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            将选中的 {selectedIds.size} 条寄样记录标记为已归还，此操作不可撤销。
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setBatchDialog(false)}>
              取消
            </Button>
            <Button onClick={handleBatchReturn}>
              确认归还
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
