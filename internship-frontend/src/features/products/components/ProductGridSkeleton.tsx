interface Props {
  cards?: number;
}

export default function ProductGridSkeleton({ cards = 6 }: Props) {
  return (
    <div className="animate-pulse">
      <div className="mb-4 h-8 w-48 rounded-md bg-slate-200 dark:bg-zinc-700 shimmer" />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900"
          >
            <div className="h-44 rounded-xl bg-slate-200 dark:bg-zinc-700 shimmer" />
            <div className="mt-4 h-4 w-4/5 rounded bg-slate-200 dark:bg-zinc-700 shimmer" />
            <div className="mt-2 h-4 w-1/3 rounded bg-slate-200 dark:bg-zinc-700 shimmer" />
            <div className="mt-4 h-10 w-full rounded-md bg-slate-200 dark:bg-zinc-700 shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}
