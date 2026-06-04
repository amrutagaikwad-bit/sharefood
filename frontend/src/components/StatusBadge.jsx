const styles = {
  CREATED: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-green-100 text-green-800",
  REQUESTED: "bg-amber-100 text-amber-800",
  RESERVED: "bg-blue-100 text-blue-800",
  PICKED_UP: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  EXPIRED: "bg-gray-200 text-gray-700",
  DELETED: "bg-red-100 text-red-700",
  INVALID: "bg-red-200 text-red-900",
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-green-100 text-green-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-200 text-gray-600",
  PAUSED: "bg-orange-100 text-orange-800",
  CONFIRMED: "bg-green-100 text-green-800",
  Pending: "bg-amber-100 text-amber-800",
  Confirmed: "bg-green-100 text-green-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-gray-200 text-gray-600"
};

const labels = {
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  PENDING: "Pending"
};

export default function StatusBadge({ status }) {
  const cls = styles[status] || "bg-slate-100 text-slate-700";
  const text = labels[status] || status?.replace(/_/g, " ");
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {text}
    </span>
  );
}
