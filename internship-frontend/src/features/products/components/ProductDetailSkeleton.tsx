export default function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-4 py-8">
      <div className="mx-auto mb-6 max-w-7xl">
        <div className="h-5 w-40 rounded bg-slate-700/90 shimmer" />
      </div>

      <div className="mx-auto max-w-7xl rounded-2xl border border-slate-700 bg-slate-800/50 p-8 shadow-2xl backdrop-blur-lg">
        <div className="grid gap-12 md:grid-cols-2">
          <div className="rounded-xl bg-white p-8">
            <div className="h-96 w-full rounded bg-slate-200 shimmer" />
          </div>

          <div className="animate-pulse text-white">
            <div className="mb-4 h-6 w-24 rounded-full bg-slate-700 shimmer" />
            <div className="mb-4 h-10 w-4/5 rounded bg-slate-700 shimmer" />
            <div className="mb-6 h-10 w-32 rounded bg-slate-700 shimmer" />

            <div className="mb-6">
              <div className="mb-3 h-5 w-20 rounded bg-slate-700 shimmer" />
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-slate-700 shimmer" />
                <div className="h-8 w-12 rounded bg-slate-700 shimmer" />
                <div className="h-10 w-10 rounded-lg bg-slate-700 shimmer" />
              </div>
            </div>

            <div className="mb-8 flex gap-4">
              <div className="h-12 flex-1 rounded-lg bg-slate-700 shimmer" />
              <div className="h-12 flex-1 rounded-lg bg-slate-700 shimmer" />
            </div>

            <div className="border-t border-slate-700 pt-6">
              <div className="mb-3 h-6 w-52 rounded bg-slate-700 shimmer" />
              <div className="h-4 w-full rounded bg-slate-700 shimmer" />
              <div className="mt-2 h-4 w-11/12 rounded bg-slate-700 shimmer" />
              <div className="mt-2 h-4 w-10/12 rounded bg-slate-700 shimmer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
