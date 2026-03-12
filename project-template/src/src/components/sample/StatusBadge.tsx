import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  sent: { label: "已寄出", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  returned: { label: "已归还", className: "bg-green-100 text-green-800 hover:bg-green-100" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: "" };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

export function SampleTags({
  abnormalNote,
  returnTrackingNumber,
  status,
}: {
  abnormalNote?: string | null;
  returnTrackingNumber?: string | null;
  status: string;
}) {
  return (
    <>
      {status === "sent" && returnTrackingNumber && (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          待收货
        </Badge>
      )}
      {abnormalNote && (
        <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
          异常
        </Badge>
      )}
    </>
  );
}
