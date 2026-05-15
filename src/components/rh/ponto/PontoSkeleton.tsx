// PontoSkeleton — loading state for /rh/ponto page

export default function PontoSkeleton({ isManager }: { isManager: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-hero-gradient px-6 pt-8 pb-6">
        <div className="h-7 w-40 bg-white/20 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
      </div>

      <div className="px-4 py-6 max-w-sm mx-auto space-y-4">
        {isManager ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl bg-card border border-border p-4 h-20 animate-pulse" />
              ))}
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-card border border-border p-4 h-16 animate-pulse" />
            ))}
          </>
        ) : (
          <div className="rounded-2xl bg-card border border-border p-6 h-48 animate-pulse" />
        )}
      </div>
    </div>
  )
}
