export default function ProductDetailSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-8">
      <div className="grid gap-6 sm:gap-8 md:grid-cols-2 md:gap-12">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-950 sm:p-6 lg:p-8">
          <div className="h-52 w-full rounded bg-slate-200 shimmer dark:bg-zinc-800 sm:h-64 md:h-80 lg:h-96" />
        </div>

        <div className="animate-pulse">
          <div className="mb-4 h-6 w-24 rounded-full bg-slate-200 shimmer dark:bg-zinc-800" />
          <div className="mb-4 h-10 w-4/5 rounded bg-slate-200 shimmer dark:bg-zinc-800" />
          <div className="mb-6 h-10 w-32 rounded bg-slate-200 shimmer dark:bg-zinc-800" />

          <div className="mb-6">
            <div className="mb-3 h-5 w-20 rounded bg-slate-200 shimmer dark:bg-zinc-800" />
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-slate-200 shimmer dark:bg-zinc-800" />
              <div className="h-8 w-12 rounded bg-slate-200 shimmer dark:bg-zinc-800" />
              <div className="h-10 w-10 rounded-lg bg-slate-200 shimmer dark:bg-zinc-800" />
            </div>
          </div>

          <div className="mb-8 flex gap-4">
            <div className="h-12 flex-1 rounded-lg bg-slate-200 shimmer dark:bg-zinc-800" />
            <div className="h-12 flex-1 rounded-lg bg-slate-200 shimmer dark:bg-zinc-800" />
          </div>

          <div className="border-t border-slate-200 pt-6 dark:border-zinc-700">
            <div className="mb-3 h-6 w-52 rounded bg-slate-200 shimmer dark:bg-zinc-800" />
            <div className="h-4 w-full rounded bg-slate-200 shimmer dark:bg-zinc-800" />
            <div className="mt-2 h-4 w-11/12 rounded bg-slate-200 shimmer dark:bg-zinc-800" />
            <div className="mt-2 h-4 w-10/12 rounded bg-slate-200 shimmer dark:bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
