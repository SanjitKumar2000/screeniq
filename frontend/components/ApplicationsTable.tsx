"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listApplications } from "@/lib/api";
import { ScoreBadge } from "./ScoreBadge";

export function ApplicationsTable() {
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["applications", page, pageSize],
    queryFn: () => listApplications(page, pageSize),
    placeholderData: (prev) => prev, // keep old page visible while next loads
  });

  if (isLoading) return <p className="text-gray-500">Loading…</p>;
  if (isError) return <p className="text-red-600">{(error as Error).message}</p>;
  if (!data) return null;

  const totalPages = Math.max(1, Math.ceil(data.count / pageSize));

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                Candidate
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                AI Score
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                Screened
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.results.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No screenings yet. Run one from{" "}
                  <a href="/screen" className="text-indigo-600 underline">
                    /screen
                  </a>
                  .
                </td>
              </tr>
            ) : (
              data.results.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">
                    {app.candidate_name || (
                      <span className="text-gray-400">#{app.id}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <ScoreBadge value={app.ai_score} />
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {new Date(app.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <a
                      href={`/dashboard/${app.id}`}
                      className="rounded-md border px-3 py-1 text-xs font-medium text-indigo-700"
                    >
                      View detail
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Page {page} of {totalPages} · {data.count} total
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
