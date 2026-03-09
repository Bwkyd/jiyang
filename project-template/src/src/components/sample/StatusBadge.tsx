import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type SampleStatus } from "@/types";

const statusVariant: Record<SampleStatus, string> = {
  sent: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  pending_receipt: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  returned: "bg-green-100 text-green-800 hover:bg-green-100",
  abnormal: "bg-red-100 text-red-800 hover:bg-red-100",
};

export function StatusBadge({ status }: { status: SampleStatus }) {
  return (
    <Badge variant="outline" className={statusVariant[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
