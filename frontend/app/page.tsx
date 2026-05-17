export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">ScreenIQ</h1>
      <p className="text-gray-600">
        AI-powered candidate screener. Paste a job description and a resume,
        get a calibrated fit score plus three reasons.
      </p>
      <div className="flex gap-3">
        <a
          href="/screen"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Screen a candidate
        </a>
        <a
          href="/dashboard"
          className="rounded-md border px-4 py-2 text-sm font-semibold"
        >
          View past screenings
        </a>
      </div>
    </div>
  );
}
