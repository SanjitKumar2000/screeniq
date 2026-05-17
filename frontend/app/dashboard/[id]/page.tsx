"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { getApplication } from "@/lib/api";
import { ScoreBadge } from "@/components/ScoreBadge";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["application", id],
    queryFn: () => getApplication(id),
    enabled: Number.isFinite(id),
  });

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="text-sm text-indigo-600 underline"
      >
        ← Back to past screenings
      </Link>

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && (
        <p className="text-red-600">{(error as Error).message}</p>
      )}

      {data && (
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {data.candidate_name || `Application #${data.id}`}
              </h1>
              <p className="text-sm text-gray-600">
                Screened {new Date(data.created_at).toLocaleString()}
              </p>
            </div>
            <ScoreBadge value={data.ai_score} />
          </div>

          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm">
            <div>
              <dt className="font-semibold text-gray-600">AI provider</dt>
              <dd>{data.ai_provider}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-600">AI model</dt>
              <dd>{data.ai_model}</dd>
            </div>
          </dl>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Why this score</h2>
            {data.ai_reasons.length === 0 ? (
              <p className="text-sm text-gray-500">No reasons recorded.</p>
            ) : (
              <ul className="list-disc space-y-1 rounded-lg border border-gray-200 bg-white p-4 pl-8 text-sm">
                {data.ai_reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Job description</h2>
            <pre className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-4 text-sm font-sans text-gray-800">
              {data.job_description}
            </pre>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Resume</h2>
            <pre className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-4 text-sm font-sans text-gray-800">
              {data.resume}
            </pre>
          </section>
        </div>
      )}
    </div>
  );
}
