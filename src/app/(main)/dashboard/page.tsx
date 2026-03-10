import { getSession } from "@/lib/auth/session";
import { getSampleStats, getSamples } from "@/services/sample.service";
import { getOverdueSamples } from "@/services/collection.service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { StatusBadge } from "@/components/sample/StatusBadge";
import type { SampleStatus } from "@/types";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const userId = user.role === "admin" ? undefined : user.id;
  const [stats, recentResult, overdue] = await Promise.all([
    getSampleStats(userId),
    getSamples({ userId, page: 1, pageSize: 5 }),
    getOverdueSamples(userId),
  ]);

  const statCards = [
    {
      label: "已寄出",
      value: stats["sent"] || 0,
      icon: Package,
      color: "text-blue-600",
      href: "/samples?status=sent",
    },
    {
      label: "催收中",
      value: stats["collecting"] || 0,
      icon: Clock,
      color: "text-orange-600",
      href: "/samples?status=collecting",
    },
    {
      label: "待收货",
      value: stats["pending_receipt"] || 0,
      icon: Clock,
      color: "text-gray-600",
      href: "/samples?status=pending_receipt",
    },
    {
      label: "超期样衣",
      value: overdue.length,
      icon: AlertTriangle,
      color: "text-red-600",
      href: "/collections",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          欢迎回来，{user.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          })}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {card.label}
                      </p>
                      <p className={`text-2xl font-bold ${card.color}`}>
                        {card.value}
                      </p>
                    </div>
                    <Icon className={`h-8 w-8 ${card.color} opacity-20`} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 最近寄样 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">最近寄样记录</CardTitle>
          <Link
            href="/samples"
            className="text-sm text-muted-foreground hover:underline"
          >
            查看全部
          </Link>
        </CardHeader>
        <CardContent>
          {recentResult.data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              暂无寄样记录
            </p>
          ) : (
            <div className="space-y-2">
              {recentResult.data.map((sample) => (
                <div
                  key={sample.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono">{sample.skuCode}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={sample.status as SampleStatus} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(sample.sentAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 超期提醒 */}
      {overdue.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              超期提醒
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdue.slice(0, 5).map((sample) => {
                const days = Math.floor(
                  (Date.now() - new Date(sample.sentAt).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={sample.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <span className="text-sm font-mono">{sample.skuCode}</span>
                    <Badge variant="destructive" className="text-xs">
                      超期 {days} 天
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
