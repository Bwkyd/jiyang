import { getSession } from "@/lib/auth/session";
import { getTalentById } from "@/services/talent.service";
import { getSamples } from "@/services/sample.service";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/sample/StatusBadge";
import { ArrowLeft, Phone, MapPin } from "lucide-react";
import type { SampleStatus } from "@/types";

export default async function TalentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const talent = await getTalentById(
    Number(id),
    user.role === "admin" ? undefined : user.id
  );

  if (!talent) notFound();

  const allSamples = await getSamples({
    talentId: talent.id,
    userId: user.role === "admin" ? undefined : user.id,
    pageSize: 100,
  });

  const unreturned = allSamples.data.filter(
    (s) => s.status !== "returned"
  );
  const returned = allSamples.data.filter(
    (s) => s.status === "returned"
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/talents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">{talent.name}</h2>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            {talent.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {talent.phone}
              </span>
            )}
            {talent.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {talent.address}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{allSamples.total}</p>
            <p className="text-xs text-muted-foreground">总寄样</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {unreturned.length}
            </p>
            <p className="text-xs text-muted-foreground">未归还</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {returned.length}
            </p>
            <p className="text-xs text-muted-foreground">已归还</p>
          </CardContent>
        </Card>
      </div>

      {/* 未归还 */}
      {unreturned.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">未归还样衣</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unreturned.map((sample) => (
                <div
                  key={sample.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <span className="text-sm font-mono">{sample.skuCode}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={sample.status as SampleStatus} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(sample.sentAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 已归还 */}
      {returned.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">
              已归还样衣
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {returned.map((sample) => (
                <div
                  key={sample.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <span className="text-sm font-mono text-muted-foreground">
                    {sample.skuCode}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={sample.status as SampleStatus} />
                    <span className="text-xs text-muted-foreground">
                      {sample.returnedAt
                        ? new Date(sample.returnedAt).toLocaleDateString("zh-CN")
                        : "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
