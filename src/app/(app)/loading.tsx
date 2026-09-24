export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando">
      <div className="skeleton h-9 w-56" />
      <div className="skeleton h-40 w-full !rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-64" /><div className="skeleton h-64" />
      </div>
    </div>
  );
}
