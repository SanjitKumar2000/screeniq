"use client";

import { useRef, useState } from "react";

import { API_BASE, getAccessToken } from "@/lib/api";
import { parseScore, scoreColorClass } from "@/lib/score";

interface StreamingResult {
  partialText: string;
  score: number | null;
  reasons: string[];
  applicationId: number | null;
  done: boolean;
  error: string | null;
}

const INITIAL: StreamingResult = {
  partialText: "",
  score: null,
  reasons: [],
  applicationId: null,
  done: false,
  error: null,
};

export function ScreeningForm() {
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<StreamingResult>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSubmit() {
    if (submitting) return;
    setResult(INITIAL);
    setSubmitting(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/api/screen/stream/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken() ?? ""}`,
        },
        body: JSON.stringify({
          job_description: jobDescription,
          resume,
          candidate_name: candidateName,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // SSE parser: events separated by \n\n; each event has lines like
      //   event: token
      //   data: {"token": "abc"}
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sepIdx;
        while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);
          handleSseEvent(rawEvent, setResult);
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setResult((r) => ({ ...r, error: (err as Error).message }));
    } finally {
      setSubmitting(false);
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setSubmitting(false);
  }

  const liveScore =
    result.score ?? parseScore(result.partialText); // backstop while streaming

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Candidate name <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={candidateName}
          onChange={(e) => setCandidateName(e.target.value)}
          placeholder="e.g. Jane Doe"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Job description
        </label>
        <textarea
          className="mt-1 h-48 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here…"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Candidate resume
        </label>
        <textarea
          className="mt-1 h-64 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="Paste the resume text here…"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            submitting ||
            jobDescription.trim().length < 20 ||
            resume.trim().length < 20
          }
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Screening…" : "Screen candidate"}
        </button>
        {submitting && (
          <button
            type="button"
            onClick={cancel}
            className="rounded-md border px-3 py-2 text-sm"
          >
            Cancel
          </button>
        )}
      </div>

      {(result.partialText || result.done || result.error) && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">AI score:</span>
            <span
              className={`inline-flex min-w-[3rem] justify-center rounded-md border px-2 py-1 text-base font-semibold ${scoreColorClass(liveScore)}`}
            >
              {liveScore !== null ? liveScore.toFixed(1) : "…"}
            </span>
            {!result.done && submitting && (
              <span className="text-xs text-gray-500">streaming…</span>
            )}
          </div>

          {result.reasons.length > 0 ? (
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-800">
              {result.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : (
            <pre className="whitespace-pre-wrap text-xs text-gray-500">
              {result.partialText}
            </pre>
          )}

          {result.error && (
            <p className="mt-3 text-sm text-red-600">{result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

function handleSseEvent(
  rawEvent: string,
  setResult: React.Dispatch<React.SetStateAction<StreamingResult>>,
) {
  const lines = rawEvent.split("\n");
  let eventName = "message";
  let dataStr = "";
  for (const line of lines) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
  }
  if (!dataStr) return;

  try {
    const data = JSON.parse(dataStr);
    if (eventName === "token") {
      setResult((r) => ({ ...r, partialText: r.partialText + (data.token ?? "") }));
    } else if (eventName === "done") {
      setResult((r) => ({
        ...r,
        score: data.score,
        reasons: data.reasons ?? [],
        applicationId: data.application_id,
        done: true,
      }));
    } else if (eventName === "error") {
      setResult((r) => ({ ...r, error: data.detail ?? "Unknown error" }));
    }
  } catch {
    // ignore malformed events
  }
}
