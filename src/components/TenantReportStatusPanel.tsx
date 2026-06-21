import { useEffect, useState } from "react";
import StatusBadge from "./StatusBadge";
import { useAuth } from "../context/AuthContext";
import { getTenantReportedIssues } from "../services/reportedIssueService";
import type { ReportedIssue } from "../types/ReportedIssue";

function formatDate(value: ReportedIssue["updatedAt"]) {
  return value?.toDate?.().toLocaleDateString() ?? "-";
}

export default function TenantReportStatusPanel() {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState<ReportedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    getTenantReportedIssues(currentUser.uid)
      .then(setReports)
      .catch(() => setError("Unable to load report tickets. Please try again."))
      .finally(() => setLoading(false));
  }, [currentUser]);

  return (
    <section className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">Report Tickets</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Track property reports and admin replies.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
          {reports.length} ticket{reports.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? (
        <p className="mt-5 text-slate-600 dark:text-slate-400">Loading report tickets...</p>
      ) : error ? (
        <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">{error}</p>
      ) : reports.length === 0 ? (
        <p className="mt-5 text-slate-600 dark:text-slate-400">No property reports submitted yet.</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[960px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[16%]" />
              <col className="w-[13%]" />
              <col className="w-[25%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-4">Ticket</th>
                <th className="px-4 py-4">Reason</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Admin reply</th>
                <th className="px-4 py-4">Updated</th>
                <th className="px-4 py-4">Property</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {reports.map((report) => (
                <tr key={report.id} className="align-top">
                  <td className="px-4 py-4">
                    <p className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{report.id}</p>
                    <p className="mt-1 font-black text-slate-950 dark:text-white">{report.propertyTitle}</p>
                  </td>
                  <td className="px-4 py-4 font-bold text-slate-950 dark:text-white">{report.reason}</td>
                  <td className="px-4 py-4"><StatusBadge value={report.status} /></td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{report.adminReply || "Waiting for admin reply."}</td>
                  <td className="px-4 py-4 font-bold text-slate-950 dark:text-white">{formatDate(report.updatedAt ?? report.createdAt)}</td>
                  <td className="px-4 py-4">
                    <a href={`/properties/${report.propertyId}`} className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200">View</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
