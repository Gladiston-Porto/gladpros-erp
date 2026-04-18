type ModuleRouteLoadingProps = {
  eyebrow: string;
  title: string;
  stats?: number;
};

const statsGridClass: Record<number, string> = {
  1: "md:grid-cols-1 xl:grid-cols-1",
  2: "md:grid-cols-2 xl:grid-cols-2",
  3: "md:grid-cols-2 xl:grid-cols-3",
  4: "md:grid-cols-2 xl:grid-cols-4",
};

export function ModuleRouteLoading({
  eyebrow,
  title,
  stats = 4,
}: ModuleRouteLoadingProps) {
  const normalizedStats = Math.min(Math.max(stats, 1), 4);

  return (
    <div className="space-y-8 animate-pulse">
      <section className="relative overflow-hidden rounded-2xl bg-hero-gradient p-6 text-white shadow-elevated">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="h-3 w-28 rounded-full bg-white/25" />
            <div className="h-8 w-64 rounded-full bg-white/30" />
            <div className="h-4 w-72 rounded-full bg-white/20" />
          </div>
          <div className="space-y-2 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <div className="h-3 w-24 rounded-full bg-white/20" />
            <div className="h-8 w-20 rounded-full bg-white/30" />
          </div>
        </div>

        <div className={`mt-6 grid gap-4 ${statsGridClass[normalizedStats]}`}>
          {Array.from({ length: normalizedStats }).map((_, index) => (
            <div
              key={`${eyebrow}-${index}`}
              className="space-y-2 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm"
            >
              <div className="h-3 w-24 rounded-full bg-white/20" />
              <div className="h-7 w-16 rounded-full bg-white/30" />
              <div className="h-3 w-28 rounded-full bg-white/20" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded-full bg-muted" />
            <div className="h-4 w-72 rounded-full bg-muted/80" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 rounded-2xl bg-muted" />
            <div className="h-10 w-40 rounded-2xl bg-muted" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`${title}-${index}`} className="space-y-3 rounded-2xl border border-border p-4">
              <div className="h-4 w-24 rounded-full bg-muted" />
              <div className="h-6 w-36 rounded-full bg-muted/80" />
              <div className="h-4 w-full rounded-full bg-muted/70" />
              <div className="h-4 w-5/6 rounded-full bg-muted/60" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
