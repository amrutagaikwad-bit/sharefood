import api from "../../api/client";

export async function downloadCsv(type) {
  const res = await api.get(`/admin/host/export/${type}.csv`, { responseType: "blob" });
  const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `foodbridge-${type}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-2xl font-bold text-primary">{value ?? 0}</p>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
