export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-muted/50 rounded-2xl h-24" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-muted/50 rounded-2xl h-28" />
        ))}
      </div>
    </div>
  );
}
