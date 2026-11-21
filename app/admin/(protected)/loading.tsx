/** Affiché instantanément pendant le chargement d'une page d'administration. */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Chargement">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 bg-neutral-100" />)}
      </div>
      <div className="h-32 bg-neutral-100" />
      <div className="grid gap-3 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-44 bg-neutral-100" />)}
      </div>
    </div>
  );
}
