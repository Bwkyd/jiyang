import { redirect } from "next/navigation";
import { getSession, requireAdmin } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  await requireAdmin();

  const overdueDaysResult = await db.query.settings.findFirst({
    where: eq(settings.key, "overdue_days"),
  });
  const overdueDays = overdueDaysResult?.value || "30";

  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="text-2xl font-bold">系统设置</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">催收设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">超期天数</p>
            <p className="text-sm text-muted-foreground">
              样衣寄出后超过此天数未归还将被标记为超期催收
            </p>
            <div className="flex items-center gap-2">
              <Input
                defaultValue={overdueDays}
                className="w-24"
                disabled
              />
              <span className="text-muted-foreground">天</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">关于</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            样衣寄样追踪系统 v1.0.0
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            基于 Next.js + PostgreSQL + shadcn/ui
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
