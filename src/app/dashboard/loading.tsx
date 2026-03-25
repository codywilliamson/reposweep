export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-20 animate-pulse rounded bg-muted" />
      </header>
      <div className="mb-6 h-10 w-full animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </main>
  )
}
